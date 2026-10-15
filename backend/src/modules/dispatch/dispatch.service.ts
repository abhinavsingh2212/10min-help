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
   */
  static async initiateDispatch(bookingId: string): Promise<boolean> {
    const booking = await BookingModel.findById(bookingId).populate('service');
    if (!booking) {
      logger.error(`[Dispatch] Booking '${bookingId}' not found.`);
      return false;
    }

    if (booking.status !== BookingStatus.REQUESTED && booking.status !== BookingStatus.SEARCHING && booking.status !== BookingStatus.UNFULFILLED) {
      logger.warn(`[Dispatch] Booking '${bookingId}' is not in a dispatchable status (${booking.status}).`);
      return false;
    }

    // Set to SEARCHING if not already
    if (booking.status !== BookingStatus.SEARCHING) {
      booking.status = BookingStatus.SEARCHING;
      booking.statusHistory.push({
        status: BookingStatus.SEARCHING,
        timestamp: new Date(),
        note: 'Searching for nearby verified technicians',
      });
      await booking.save();

      // Emit searching status to customer
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
    const excludedTechIds = previousOffers.map((o) => o.technician.toString());

    const candidates = await this.findAndRankCandidates(booking, excludedTechIds);

    if (candidates.length === 0) {
      logger.info(`[Dispatch] No eligible technicians found for booking '${bookingId}'.`);
      // Check how many attempts have occurred
      const totalAttempts = await DispatchOfferModel.countDocuments({ booking: booking._id });
      if (totalAttempts >= DISPATCH_CONFIG.MAX_DISPATCH_RETRIES || excludedTechIds.length > 0) {
        booking.status = BookingStatus.UNFULFILLED;
        booking.statusHistory.push({
          status: BookingStatus.UNFULFILLED,
          timestamp: new Date(),
          note: 'No available technicians in your area at this time.',
        });
        await booking.save();

        this.emitToBookingRoom(bookingId, SOCKET_EVENTS.BOOKING_STATUS, {
          bookingId,
          status: BookingStatus.UNFULFILLED,
          reason: 'No available technicians currently nearby.',
        });
      }
      return false;
    }

    const selectedCandidate = candidates[0];
    const offer = await this.createOffer(booking, selectedCandidate);

    logger.info(
      `[Dispatch] Created 15s offer for tech '${selectedCandidate.technician._id}' on booking '${bookingId}'. Distance: ${selectedCandidate.distanceKm}km, ETA: ${selectedCandidate.estimatedEtaMinutes}m`
    );

    return true;
  }

  /**
   * Queries and ranks eligible technicians.
   */
  static async findAndRankCandidates(
    booking: IBooking,
    excludedTechIds: string[] = []
  ): Promise<DispatchCandidate[]> {
    const service = booking.service as any;
    const vehicleType = booking.vehicle.vehicleType;
    const [customerLon, customerLat] = booking.pickupLocation.coordinates;

    // Search query for eligible technicians
    const query: Record<string, unknown> = {
      verificationStatus: TechnicianVerificationStatus.VERIFIED,
      isOnline: true,
      activeBookingId: { $exists: false },
      skills: service.category,
      supportedVehicles: vehicleType,
      _id: {
        $nin: excludedTechIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    };

    const eligibleTechnicians = await TechnicianModel.find(query).populate('user', 'name phone');

    const candidates: DispatchCandidate[] = [];

    for (const tech of eligibleTechnicians) {
      const [techLon, techLat] = tech.currentLocation?.coordinates || [77.5946, 12.9716];
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
   * Atomic acceptance of an offer by a technician.
   * Guarantees only one technician wins the booking.
   */
  static async acceptOffer(offerId: string, technicianUserId: string): Promise<IBooking> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) throw new Error('Technician profile not found');

    const offer = await DispatchOfferModel.findById(offerId);
    if (!offer) throw new Error('Dispatch offer not found');

    if (offer.technician.toString() !== tech._id.toString()) {
      throw new Error('This offer was not assigned to you.');
    }

    if (offer.status !== DispatchOfferStatus.PENDING) {
      throw new Error(`Offer is no longer active (Status: ${offer.status})`);
    }

    if (new Date() > offer.expiresAt) {
      offer.status = DispatchOfferStatus.EXPIRED;
      offer.respondedAt = new Date();
      await offer.save();
      throw new Error('Offer has expired. 15-second response window exceeded.');
    }

    // ATOMIC ASSIGNMENT: findOneAndUpdate ensuring status is still SEARCHING
    const assignedBooking = await BookingModel.findOneAndUpdate(
      {
        _id: offer.booking,
        status: BookingStatus.SEARCHING,
      },
      {
        $set: {
          technician: tech._id,
          status: BookingStatus.ASSIGNED,
          assignedAt: new Date(),
          estimatedEtaMinutes: offer.metadata?.estimatedEtaMinutes || 10,
        },
        $push: {
          statusHistory: {
            status: BookingStatus.ASSIGNED,
            timestamp: new Date(),
            note: `Assigned to verified technician ${tech.businessName || 'Partner'}`,
            updatedBy: tech._id.toString(),
          },
        },
      },
      { new: true }
    ).populate('customer', 'name phone emergencyContactPhone');

    if (!assignedBooking) {
      offer.status = DispatchOfferStatus.EXPIRED;
      offer.respondedAt = new Date();
      await offer.save();
      throw new Error('Booking is no longer available or was claimed by another technician.');
    }

    // Mark offer as accepted
    offer.status = DispatchOfferStatus.ACCEPTED;
    offer.respondedAt = new Date();
    await offer.save();

    // Mark technician busy with this booking
    tech.activeBookingId = assignedBooking._id as any;
    await tech.save();

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
   * Rejects an offer or handles timeout, triggering dispatch retry.
   */
  static async rejectOffer(offerId: string, technicianUserId: string, reason?: string): Promise<boolean> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) return false;

    const offer = await DispatchOfferModel.findById(offerId);
    if (!offer || offer.technician.toString() !== tech._id.toString()) return false;

    if (offer.status === DispatchOfferStatus.PENDING) {
      offer.status = DispatchOfferStatus.REJECTED;
      offer.respondedAt = new Date();
      await offer.save();

      logger.info(`[Dispatch] Technician '${tech._id}' rejected offer '${offerId}'. Retrying next candidate...`);

      // Try next candidate
      await this.initiateDispatch(offer.booking.toString());
      return true;
    }

    return false;
  }

  /**
   * Cron/Interval worker to check for expired pending offers.
   */
  static async processExpiredOffers(): Promise<number> {
    const now = new Date();
    const expiredOffers = await DispatchOfferModel.find({
      status: DispatchOfferStatus.PENDING,
      expiresAt: { $lt: now },
    });

    for (const offer of expiredOffers) {
      offer.status = DispatchOfferStatus.EXPIRED;
      offer.respondedAt = now;
      await offer.save();

      logger.info(`[Dispatch] Offer '${offer._id}' expired after 15s. Triggering next candidate...`);
      // Retry dispatch
      await this.initiateDispatch(offer.booking.toString());
    }

    return expiredOffers.length;
  }

  private static emitToBookingRoom(bookingId: string, event: string, payload: unknown) {
    const io = getSocketServer();
    if (io) {
      io.to(`booking:${bookingId}`).emit(event, payload);
      io.to('admin:dispatch').emit(event, payload);
    }
  }
}
