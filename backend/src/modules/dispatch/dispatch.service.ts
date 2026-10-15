import mongoose from 'mongoose';
import { BookingModel, IBooking } from '../../models/Booking';
import { TechnicianModel, ITechnician } from '../../models/Technician';
import { DispatchOfferModel, IDispatchOffer } from '../../models/DispatchOffer';
import { AuditLogModel } from '../../models/AuditLog';
import {
  BookingStatus,
  DISPATCH_CONFIG,
  DispatchOfferStatus,
  SOCKET_EVENTS,
  TechnicianVerificationStatus,
} from '@10min-help/shared';
import { calculateHaversineDistanceKm, estimateRoadEtaMinutes } from '../../utils/distance';
import { logger } from '../../config/logger';
import { getSocketServer } from '../../sockets';

export interface DispatchCandidate {
  technician: ITechnician;
  distanceKm: number;
  estimatedEtaMinutes: number;
  score: number;
}

export class DispatchService {
  /**
   * Dispatches a booking: finds candidates, ranks them, and creates offer for candidate #1.
   * Concurrency-safe and idempotent if an active pending offer already exists.
   */
  static async initiateDispatch(bookingId: string): Promise<boolean> {
    const booking = await BookingModel.findById(bookingId).populate('service');
    if (!booking) {
      logger.error(`[Dispatch] Booking '${bookingId}' not found.`);
      return false;
    }

    if (
      booking.status !== BookingStatus.REQUESTED &&
      booking.status !== BookingStatus.SEARCHING &&
      booking.status !== BookingStatus.UNFULFILLED
    ) {
      logger.warn(
        `[Dispatch] Booking '${bookingId}' is not in a dispatchable status (${booking.status}).`
      );
      return false;
    }

    const now = new Date();

    // Prevent duplicate concurrent offers for the same booking
    const activePendingOffer = await DispatchOfferModel.findOne({
      booking: booking._id,
      status: DispatchOfferStatus.PENDING,
      expiresAt: { $gt: now },
    });
    if (activePendingOffer) {
      return true;
    }

    // Expire any stale pending offers for this booking before starting a new round
    await DispatchOfferModel.updateMany(
      {
        booking: booking._id,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { $lte: now },
      },
      {
        $set: { status: DispatchOfferStatus.EXPIRED, respondedAt: now },
      }
    );

    // Transition to SEARCHING if not already
    if (booking.status !== BookingStatus.SEARCHING) {
      booking.status = BookingStatus.SEARCHING;
      booking.statusHistory.push({
        status: BookingStatus.SEARCHING,
        timestamp: now,
        note: 'Searching for nearby verified technicians',
      });
      await booking.save();

      this.emitToBookingRoom(bookingId, SOCKET_EVENTS.BOOKING_SEARCHING, {
        bookingId,
        status: BookingStatus.SEARCHING,
      });
    }

    // Find previously rejected/expired technicians for this booking to avoid immediate repeats
    const previousOffers = await DispatchOfferModel.find({
      booking: booking._id,
      status: { $in: [DispatchOfferStatus.REJECTED, DispatchOfferStatus.EXPIRED] },
    });

    if (previousOffers.length >= DISPATCH_CONFIG.MAX_DISPATCH_RETRIES) {
      await this.markBookingUnfulfilled(
        booking,
        `Maximum dispatch retry rounds (${DISPATCH_CONFIG.MAX_DISPATCH_RETRIES}) reached without acceptance.`
      );
      return false;
    }

    const excludedTechIds = previousOffers.map((o) => o.technician.toString());
    const candidates = await this.findAndRankCandidates(booking, excludedTechIds);

    if (candidates.length === 0) {
      logger.info(`[Dispatch] No eligible technicians found for booking '${bookingId}'.`);
      await this.markBookingUnfulfilled(
        booking,
        'No available verified technicians in your service radius at this time.'
      );
      return false;
    }

    const selectedCandidate = candidates[0];
    await this.createOffer(booking, selectedCandidate);

    logger.info(
      `[Dispatch] Created 15s offer for tech '${selectedCandidate.technician._id}' on booking '${bookingId}'. Distance: ${selectedCandidate.distanceKm}km, ETA: ${selectedCandidate.estimatedEtaMinutes}m`
    );

    return true;
  }

  private static async markBookingUnfulfilled(booking: IBooking, reason: string) {
    booking.status = BookingStatus.UNFULFILLED;
    booking.statusHistory.push({
      status: BookingStatus.UNFULFILLED,
      timestamp: new Date(),
      note: reason,
    });
    await booking.save();

    this.emitToBookingRoom(booking._id.toString(), SOCKET_EVENTS.BOOKING_STATUS, {
      bookingId: booking._id.toString(),
      status: BookingStatus.UNFULFILLED,
      reason,
    });
  }

  /**
   * Queries and ranks eligible technicians.
   * Requires verified status, online availability, no active booking, matching skill & vehicle,
   * and valid GPS coordinates within the search radius.
   */
  static async findAndRankCandidates(
    booking: IBooking,
    excludedTechIds: string[] = []
  ): Promise<DispatchCandidate[]> {
    const service = booking.service as any;
    const vehicleType = booking.vehicle.vehicleType;
    const [customerLon, customerLat] = booking.pickupLocation.coordinates;

    const query: Record<string, unknown> = {
      verificationStatus: TechnicianVerificationStatus.VERIFIED,
      isOnline: true,
      $or: [{ activeBookingId: { $exists: false } }, { activeBookingId: null }],
      skills: service.category,
      supportedVehicles: vehicleType,
      _id: {
        $nin: excludedTechIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      },
    };

    const eligibleTechnicians = await TechnicianModel.find(query).populate('user', 'name phone isActive');

    const candidates: DispatchCandidate[] = [];

    for (const tech of eligibleTechnicians) {
      // Skip technicians whose underlying user account is deactivated
      if ((tech.user as any)?.isActive === false) {
        continue;
      }

      const coords = tech.currentLocation?.coordinates;
      if (
        !Array.isArray(coords) ||
        coords.length !== 2 ||
        !Number.isFinite(coords[0]) ||
        !Number.isFinite(coords[1])
      ) {
        continue;
      }

      const [techLon, techLat] = coords;
      const distanceKm = calculateHaversineDistanceKm(customerLat, customerLon, techLat, techLon);

      if (distanceKm <= DISPATCH_CONFIG.DEFAULT_SEARCH_RADIUS_KM) {
        const estimatedEtaMinutes = estimateRoadEtaMinutes(distanceKm);
        // Scoring formula: ETA penalty + rating bonus
        const score = estimatedEtaMinutes * 2 - (tech.ratingAverage || 5) * 1.5;
        candidates.push({
          technician: tech,
          distanceKm,
          estimatedEtaMinutes,
          score,
        });
      }
    }

    // Sort by best score (lowest score = fastest and best rated)
    candidates.sort((a, b) => a.score - b.score);
    return candidates;
  }

  /**
   * Creates a 15-second DispatchOffer and sends real-time socket alert.
   */
  static async createOffer(booking: IBooking, candidate: DispatchCandidate): Promise<IDispatchOffer> {
    const expiresAt = new Date(Date.now() + DISPATCH_CONFIG.OFFER_EXPIRY_SECONDS * 1000);
    const roundNumber = (await DispatchOfferModel.countDocuments({ booking: booking._id })) + 1;

    const offer = await DispatchOfferModel.create({
      booking: booking._id,
      technician: candidate.technician._id,
      status: DispatchOfferStatus.PENDING,
      offeredAt: new Date(),
      expiresAt,
      roundNumber,
      metadata: {
        distanceKm: candidate.distanceKm,
        estimatedEtaMinutes: candidate.estimatedEtaMinutes,
        quotedPrice: booking.quotedPrice,
      },
    });

    // Notify technician via Socket.IO
    const io = getSocketServer();
    if (io) {
      const serviceName = (booking.service as any)?.name || 'Roadside Assistance';
      io.to(`technician:${candidate.technician._id.toString()}`).emit(SOCKET_EVENTS.BOOKING_OFFER, {
        offerId: offer._id.toString(),
        bookingId: booking._id.toString(),
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: DISPATCH_CONFIG.OFFER_EXPIRY_SECONDS,
        serviceName,
        vehicleType: booking.vehicle.vehicleType,
        customerAddress: booking.pickupLocation.address || 'Roadside location',
        distanceKm: candidate.distanceKm,
        estimatedEtaMinutes: candidate.estimatedEtaMinutes,
        quotedPrice: booking.quotedPrice,
      });
    }

    return offer;
  }

  /**
   * Returns active non-expired offer for a technician (used on app launch or reconnect).
   */
  static async getPendingOfferForTechnician(technicianUserId: string) {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) return null;

    const now = new Date();
    const offer = await DispatchOfferModel.findOne({
      technician: tech._id,
      status: DispatchOfferStatus.PENDING,
      expiresAt: { $gt: now },
    })
      .populate({
        path: 'booking',
        populate: { path: 'service', select: 'name category' },
      })
      .sort({ createdAt: -1 });

    if (!offer || !offer.booking) return null;

    const booking = offer.booking as any;
    const remainingSeconds = Math.max(
      1,
      Math.ceil((offer.expiresAt.getTime() - now.getTime()) / 1000)
    );

    return {
      offerId: offer._id.toString(),
      bookingId: booking._id.toString(),
      expiresAt: offer.expiresAt.toISOString(),
      expiresInSeconds: remainingSeconds,
      serviceName: booking.service?.name || 'Roadside Assistance',
      vehicleType: booking.vehicle?.vehicleType,
      customerAddress: booking.pickupLocation?.address || 'Roadside location',
      distanceKm: offer.metadata?.distanceKm || 1.5,
      estimatedEtaMinutes: offer.metadata?.estimatedEtaMinutes || 8,
      quotedPrice: offer.metadata?.quotedPrice || booking.quotedPrice,
    };
  }

  /**
   * Atomic acceptance of an offer by a technician.
   * Guarantees only one technician wins the booking and a technician cannot accept conflicting jobs.
   */
  static async acceptOffer(offerId: string, technicianUserId: string): Promise<IBooking> {
    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      const err: any = new Error('Invalid dispatch offer ID');
      err.statusCode = 400;
      throw err;
    }

    const tech = await TechnicianModel.findOne({ user: technicianUserId }).populate('user', 'name phone');
    if (!tech) {
      const err: any = new Error('Technician profile not found');
      err.statusCode = 404;
      throw err;
    }

    if (tech.verificationStatus !== TechnicianVerificationStatus.VERIFIED) {
      const err: any = new Error('Only verified technicians can accept dispatch offers.');
      err.statusCode = 403;
      throw err;
    }

    const offer = await DispatchOfferModel.findById(offerId);
    if (!offer) {
      const err: any = new Error('Dispatch offer not found');
      err.statusCode = 404;
      throw err;
    }

    if (offer.technician.toString() !== tech._id.toString()) {
      const err: any = new Error('This offer was not assigned to you.');
      err.statusCode = 403;
      throw err;
    }

    if (offer.status !== DispatchOfferStatus.PENDING) {
      const err: any = new Error(`Offer is no longer active (Status: ${offer.status})`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    if (now > offer.expiresAt) {
      await DispatchOfferModel.updateOne(
        { _id: offer._id, status: DispatchOfferStatus.PENDING },
        { $set: { status: DispatchOfferStatus.EXPIRED, respondedAt: now } }
      );
      const err: any = new Error('Offer has expired. 15-second response window exceeded.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Atomically claim the offer
    const claimedOffer = await DispatchOfferModel.findOneAndUpdate(
      {
        _id: offer._id,
        technician: tech._id,
        status: DispatchOfferStatus.PENDING,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          status: DispatchOfferStatus.ACCEPTED,
          respondedAt: now,
        },
      },
      { new: true }
    );

    if (!claimedOffer) {
      const err: any = new Error('Offer is no longer active or has expired.');
      err.statusCode = 409;
      throw err;
    }

    // 2. Atomically claim the technician so they cannot accept two jobs concurrently
    const claimedTech = await TechnicianModel.findOneAndUpdate(
      {
        _id: tech._id,
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
        isOnline: true,
        $or: [{ activeBookingId: { $exists: false } }, { activeBookingId: null }],
      },
      {
        $set: { activeBookingId: offer.booking },
      },
      { new: true }
    );

    if (!claimedTech) {
      await DispatchOfferModel.findByIdAndUpdate(offer._id, {
        $set: { status: DispatchOfferStatus.REJECTED, respondedAt: now },
      });
      const err: any = new Error('You already have an active job or are offline.');
      err.statusCode = 409;
      throw err;
    }

    // 3. Atomically assign the booking ensuring status is still SEARCHING
    const assignedBooking = await BookingModel.findOneAndUpdate(
      {
        _id: offer.booking,
        status: BookingStatus.SEARCHING,
      },
      {
        $set: {
          technician: tech._id,
          status: BookingStatus.ASSIGNED,
          assignedAt: now,
          estimatedEtaMinutes: offer.metadata?.estimatedEtaMinutes || 10,
        },
        $push: {
          statusHistory: {
            status: BookingStatus.ASSIGNED,
            timestamp: now,
            note: `Assigned to verified technician ${tech.businessName || (tech.user as any)?.name || 'Partner'}`,
            updatedBy: tech._id.toString(),
          },
        },
      },
      { new: true }
    )
      .populate('customer', 'name phone emergencyContactPhone')
      .populate('service');

    if (!assignedBooking) {
      // Roll back technician claim and expire offer
      await TechnicianModel.findByIdAndUpdate(tech._id, {
        $unset: { activeBookingId: 1 },
      });
      await DispatchOfferModel.findByIdAndUpdate(offer._id, {
        $set: { status: DispatchOfferStatus.EXPIRED, respondedAt: now },
      });
      const err: any = new Error('Booking is no longer available or was claimed by another technician.');
      err.statusCode = 409;
      throw err;
    }

    // Expire any other pending offers for this booking
    await DispatchOfferModel.updateMany(
      {
        booking: assignedBooking._id,
        _id: { $ne: offer._id },
        status: DispatchOfferStatus.PENDING,
      },
      {
        $set: { status: DispatchOfferStatus.EXPIRED, respondedAt: now },
      }
    );

    // Persist Audit Log
    await AuditLogModel.create({
      actorId: tech.user,
      actorRole: 'TECHNICIAN',
      action: 'DISPATCH_OFFER_ACCEPTED',
      entityType: 'Booking',
      entityId: assignedBooking._id.toString(),
      metadata: { offerId, technicianId: tech._id.toString() },
    });

    // Notify Customer and Tech via Socket.IO
    this.emitToBookingRoom(assignedBooking._id.toString(), SOCKET_EVENTS.BOOKING_ASSIGNED, {
      bookingId: assignedBooking._id.toString(),
      status: BookingStatus.ASSIGNED,
      technician: {
        _id: tech._id.toString(),
        user: {
          name: (tech.user as any)?.name || 'Verified Technician',
          phone: (tech.user as any)?.phone,
        },
        name: (tech.user as any)?.name || 'Verified Technician',
        phone: (tech.user as any)?.phone,
        ratingAverage: tech.ratingAverage,
        totalJobsCompleted: tech.totalJobsCompleted,
        estimatedEtaMinutes: assignedBooking.estimatedEtaMinutes,
      },
    });

    return assignedBooking;
  }

  /**
   * Rejects an offer and immediately triggers dispatch retry to the next ranked candidate.
   */
  static async rejectOffer(
    offerId: string,
    technicianUserId: string,
    _reason?: string
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(offerId)) return false;

    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) return false;

    const rejectedOffer = await DispatchOfferModel.findOneAndUpdate(
      {
        _id: offerId,
        technician: tech._id,
        status: DispatchOfferStatus.PENDING,
      },
      {
        $set: {
          status: DispatchOfferStatus.REJECTED,
          respondedAt: new Date(),
        },
      },
      { new: true }
    );

    if (rejectedOffer) {
      logger.info(
        `[Dispatch] Technician '${tech._id}' rejected offer '${offerId}'. Retrying next candidate...`
      );
      await this.initiateDispatch(rejectedOffer.booking.toString());
      return true;
    }

    return false;
  }

  /**
   * Concurrency-safe worker to process expired pending offers.
   * Uses atomic conditional update per offer so only one worker processes a given expiry.
   */
  static async processExpiredOffers(): Promise<number> {
    const now = new Date();
    const expiredCandidates = await DispatchOfferModel.find({
      status: DispatchOfferStatus.PENDING,
      expiresAt: { $lt: now },
    }).select('_id booking');

    let processedCount = 0;

    for (const candidate of expiredCandidates) {
      const claimed = await DispatchOfferModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: DispatchOfferStatus.PENDING,
          expiresAt: { $lt: now },
        },
        {
          $set: {
            status: DispatchOfferStatus.EXPIRED,
            respondedAt: now,
          },
        },
        { new: true }
      );

      if (claimed) {
        processedCount += 1;
        logger.info(
          `[Dispatch] Offer '${claimed._id}' expired after 15s. Triggering next candidate...`
        );
        await this.initiateDispatch(claimed.booking.toString());
      }
    }

    return processedCount;
  }

  private static emitToBookingRoom(bookingId: string, event: string, payload: unknown) {
    const io = getSocketServer();
    if (io) {
      io.to(`booking:${bookingId}`).emit(event, payload);
      io.to('admin:dispatch').emit(event, payload);
    }
  }
}
