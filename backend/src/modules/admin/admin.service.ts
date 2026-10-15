import mongoose from 'mongoose';
import { BookingModel } from '../../models/Booking';
import { TechnicianModel } from '../../models/Technician';
import { PaymentModel } from '../../models/Payment';
import { ServiceModel } from '../../models/Service';
import { AuditLogModel } from '../../models/AuditLog';
import { DispatchOfferModel } from '../../models/DispatchOffer';
import {
  BookingStatus,
  DispatchOfferStatus,
  OperationalMetricsDTO,
  PaymentStatus,
  SOCKET_EVENTS,
  TechnicianVerificationStatus,
  VehicleType,
} from '@10min-help/shared';
import { getSocketServer } from '../../sockets';
import { logger } from '../../config/logger';

export class AdminService {
  static async getDashboardMetrics(filterDateFrom?: string): Promise<OperationalMetricsDTO> {
    const dateQuery: Record<string, unknown> = {};
    if (filterDateFrom) {
      dateQuery.createdAt = { $gte: new Date(filterDateFrom) };
    }

    const [
      totalBookings,
      completedBookings,
      activeBookings,
      cancelledBookings,
      activeAvailableMechanics,
      completedJobs,
      completedPayments,
    ] = await Promise.all([
      BookingModel.countDocuments(dateQuery),
      BookingModel.countDocuments({ ...dateQuery, status: BookingStatus.COMPLETED }),
      BookingModel.countDocuments({
        ...dateQuery,
        status: {
          $in: [
            BookingStatus.REQUESTED,
            BookingStatus.SEARCHING,
            BookingStatus.ASSIGNED,
            BookingStatus.EN_ROUTE,
            BookingStatus.ARRIVED,
            BookingStatus.INSPECTING,
            BookingStatus.AWAITING_CUSTOMER_APPROVAL,
            BookingStatus.IN_PROGRESS,
          ],
        },
      }),
      BookingModel.countDocuments({ ...dateQuery, status: BookingStatus.CANCELLED }),
      TechnicianModel.countDocuments({
        isOnline: true,
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
        $or: [{ activeBookingId: { $exists: false } }, { activeBookingId: null }],
      }),
      BookingModel.find({
        ...dateQuery,
        status: BookingStatus.COMPLETED,
        arrivedAt: { $exists: true },
        requestedAt: { $exists: true },
      }),
      PaymentModel.aggregate([
        { $match: { status: PaymentStatus.PAID, ...dateQuery } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Calculate response times
    let totalResponseMinutes = 0;
    let tenMinuteComplianceCount = 0;

    for (const job of completedJobs) {
      if (job.arrivedAt && job.requestedAt) {
        const diffMinutes = (job.arrivedAt.getTime() - job.requestedAt.getTime()) / (1000 * 60);
        totalResponseMinutes += diffMinutes;
        if (diffMinutes <= 10) {
          tenMinuteComplianceCount += 1;
        }
      }
    }

    const avgResponseTime = completedJobs.length > 0
      ? Math.round((totalResponseMinutes / completedJobs.length) * 10) / 10
      : null;

    const tenMinuteRate = completedJobs.length > 0
      ? Math.round((tenMinuteComplianceCount / completedJobs.length) * 100)
      : null;

    const completedPaymentValue = completedPayments.length > 0 ? completedPayments[0].total : 0;
    const grossBookingValue = completedJobs.reduce((sum, b) => sum + (b.approvedFinalAmount || 0), 0);
    // Platform takes 15%, 85% is technician payout liability
    const technicianPayoutLiabilities = Math.round(completedPaymentValue * 0.85);

    return {
      totalBookings,
      completedBookings,
      activeBookings,
      cancelledBookings,
      averageResponseTimeMinutes: avgResponseTime,
      tenMinuteArrivalRatePercent: tenMinuteRate,
      activeAvailableMechanics,
      grossBookingValue: grossBookingValue || completedPaymentValue,
      completedPaymentValue,
      technicianPayoutLiabilities,
    };
  }

  static async getLiveDispatchMapData() {
    const [onlineTechnicians, activeBookings] = await Promise.all([
      TechnicianModel.find({ isOnline: true })
        .populate('user', 'name phone')
        .select('user verificationStatus skills supportedVehicles isOnline currentLocation ratingAverage activeBookingId'),
      BookingModel.find({
        status: {
          $in: [
            BookingStatus.REQUESTED,
            BookingStatus.SEARCHING,
            BookingStatus.ASSIGNED,
            BookingStatus.EN_ROUTE,
            BookingStatus.ARRIVED,
            BookingStatus.INSPECTING,
            BookingStatus.IN_PROGRESS,
          ],
        },
      })
        .populate('customer', 'name phone')
        .populate('service', 'name')
        .populate({ path: 'technician', populate: { path: 'user', select: 'name phone' } }),
    ]);

    return {
      onlineTechnicians,
      technicians: onlineTechnicians,
      activeBookings,
      timestamp: new Date().toISOString(),
    };
  }

  static async listBookings(params: {
    status?: BookingStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (params.status) {
      query.status = params.status;
    }

    const [bookings, total] = await Promise.all([
      BookingModel.find(query)
        .populate('customer', 'name phone email')
        .populate('service', 'name category')
        .populate({ path: 'technician', populate: { path: 'user', select: 'name phone' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BookingModel.countDocuments(query),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async manualAssign(bookingId: string, technicianId: string, adminUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(bookingId) || !mongoose.Types.ObjectId.isValid(technicianId)) {
      const err: any = new Error('Invalid booking or technician ID.');
      err.statusCode = 400;
      throw err;
    }

    const tech = await TechnicianModel.findById(technicianId).populate('user', 'name phone isActive');
    if (!tech) {
      const err: any = new Error('Technician not found');
      err.statusCode = 404;
      throw err;
    }

    if (tech.verificationStatus !== TechnicianVerificationStatus.VERIFIED) {
      const err: any = new Error('Cannot assign unverified technician.');
      err.statusCode = 403;
      throw err;
    }

    if (!tech.isOnline) {
      const err: any = new Error('Cannot assign technician: technician is currently offline.');
      err.statusCode = 400;
      throw err;
    }

    if ((tech.user as any)?.isActive === false) {
      const err: any = new Error('Cannot assign technician: technician account is deactivated.');
      err.statusCode = 403;
      throw err;
    }

    if (tech.activeBookingId) {
      const err: any = new Error('Cannot assign technician: technician is already active on another job.');
      err.statusCode = 409;
      throw err;
    }

    const targetBooking = await BookingModel.findById(bookingId).populate('service');
    if (!targetBooking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    if (
      targetBooking.status !== BookingStatus.REQUESTED &&
      targetBooking.status !== BookingStatus.SEARCHING &&
      targetBooking.status !== BookingStatus.UNFULFILLED
    ) {
      const err: any = new Error(`Cannot assign booking in status '${targetBooking.status}'.`);
      err.statusCode = 400;
      throw err;
    }

    // Skill compatibility
    const serviceCategory = (targetBooking.service as any)?.category;
    if (serviceCategory && !tech.skills.includes(serviceCategory)) {
      const err: any = new Error(`Technician does not possess required skill for '${serviceCategory}'.`);
      err.statusCode = 400;
      throw err;
    }

    // Vehicle compatibility
    const vehicleType = targetBooking.vehicle?.vehicleType;
    if (vehicleType && !tech.supportedVehicles.includes(vehicleType)) {
      const err: any = new Error(`Technician does not service '${vehicleType}' vehicles.`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();

    // 1. Atomically reserve technician
    const claimedTech = await TechnicianModel.findOneAndUpdate(
      {
        _id: tech._id,
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
        isOnline: true,
        $or: [{ activeBookingId: { $exists: false } }, { activeBookingId: null }],
      },
      {
        $set: { activeBookingId: targetBooking._id },
      },
      { new: true }
    );

    if (!claimedTech) {
      const err: any = new Error('Technician became occupied or went offline concurrently.');
      err.statusCode = 409;
      throw err;
    }

    // 2. Atomically assign booking
    const booking = await BookingModel.findOneAndUpdate(
      {
        _id: bookingId,
        status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.UNFULFILLED] },
      },
      {
        $set: {
          technician: tech._id,
          status: BookingStatus.ASSIGNED,
          assignedAt: now,
        },
        $push: {
          statusHistory: {
            status: BookingStatus.ASSIGNED,
            timestamp: now,
            note: `Manual dispatch assignment by Admin to ${tech.businessName || (tech.user as any)?.name}`,
            updatedBy: `ADMIN:${adminUserId}`,
          },
        },
      },
      { new: true }
    );

    if (!booking) {
      // Rollback technician reservation
      await TechnicianModel.findByIdAndUpdate(tech._id, {
        $unset: { activeBookingId: 1 },
      });
      const err: any = new Error('Booking cannot be assigned (may already have been claimed or cancelled).');
      err.statusCode = 409;
      throw err;
    }

    // 3. Expire any competing pending offers for this booking
    await DispatchOfferModel.updateMany(
      { booking: booking._id, status: DispatchOfferStatus.PENDING },
      { $set: { status: DispatchOfferStatus.EXPIRED, respondedAt: now } }
    );

    await AuditLogModel.create({
      actorId: new mongoose.Types.ObjectId(adminUserId),
      actorRole: 'ADMIN',
      action: 'MANUAL_DISPATCH_ASSIGNMENT',
      entityType: 'Booking',
      entityId: booking._id.toString(),
      metadata: { technicianId },
    });

    const io = getSocketServer();
    if (io) {
      io.to(`booking:${booking._id}`).emit(SOCKET_EVENTS.BOOKING_ASSIGNED, {
        bookingId: booking._id,
        status: BookingStatus.ASSIGNED,
        technician: {
          _id: tech._id,
          name: (tech.user as any)?.name,
          phone: (tech.user as any)?.phone,
          ratingAverage: tech.ratingAverage,
        },
      });
    }

    return booking;
  }

  static async updateTechnicianVerification(
    technicianId: string,
    status: TechnicianVerificationStatus,
    notes: string | undefined,
    adminUserId: string
  ) {
    const tech = await TechnicianModel.findById(technicianId);
    if (!tech) throw new Error('Technician not found');

    tech.verificationStatus = status;
    tech.verificationNotes = notes;
    if (status === TechnicianVerificationStatus.VERIFIED) {
      tech.verifiedAt = new Date();
    }
    await tech.save();

    await AuditLogModel.create({
      actorId: new mongoose.Types.ObjectId(adminUserId),
      actorRole: 'ADMIN',
      action: `TECHNICIAN_${status}`,
      entityType: 'Technician',
      entityId: tech._id.toString(),
      metadata: { notes, newStatus: status },
    });

    return tech;
  }

  static async listTechnicians(params: { status?: TechnicianVerificationStatus }) {
    const query: Record<string, unknown> = {};
    if (params.status) {
      query.verificationStatus = params.status;
    }
    return TechnicianModel.find(query).populate('user', 'name phone email').sort({ createdAt: -1 });
  }

  static async updateServicePricing(
    serviceId: string,
    prices: { [VehicleType.BIKE]?: number; [VehicleType.CAR]?: number },
    isActive: boolean | undefined,
    adminUserId: string
  ) {
    const isObjectId = mongoose.Types.ObjectId.isValid(serviceId);
    const service = await ServiceModel.findOne({
      $or: [
        ...(isObjectId ? [{ _id: serviceId }] : []),
        { category: serviceId },
      ],
    });
    if (!service) throw new Error(`Service '${serviceId}' not found`);

    if (prices[VehicleType.BIKE] !== undefined) service.startingPrice[VehicleType.BIKE] = prices[VehicleType.BIKE]!;
    if (prices[VehicleType.CAR] !== undefined) service.startingPrice[VehicleType.CAR] = prices[VehicleType.CAR]!;
    if (isActive !== undefined) service.isActive = isActive;

    await service.save();

    await AuditLogModel.create({
      actorId: new mongoose.Types.ObjectId(adminUserId),
      actorRole: 'ADMIN',
      action: 'SERVICE_PRICING_UPDATED',
      entityType: 'Service',
      entityId: service._id.toString(),
      metadata: { newPrices: service.startingPrice, isActive },
    });

    return service;
  }

  static async getAuditLogs(limit = 50) {
    return AuditLogModel.find().populate('actorId', 'name phone role').sort({ timestamp: -1 }).limit(limit);
  }
}
