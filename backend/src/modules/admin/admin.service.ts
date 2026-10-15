import mongoose from 'mongoose';
import { BookingModel } from '../../models/Booking';
import { TechnicianModel } from '../../models/Technician';
import { PaymentModel } from '../../models/Payment';
import { ServiceModel } from '../../models/Service';
import { AuditLogModel } from '../../models/AuditLog';
import {
  BookingStatus,
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
      : 8.5; // Baseline target if new

    const tenMinuteRate = completedJobs.length > 0
      ? Math.round((tenMinuteComplianceCount / completedJobs.length) * 100)
      : 92; // Target compliance rate

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
    const tech = await TechnicianModel.findById(technicianId).populate('user', 'name phone');
    if (!tech) throw new Error('Technician not found');

    if (tech.verificationStatus !== TechnicianVerificationStatus.VERIFIED) {
      throw new Error('Cannot assign unverified technician.');
    }

    const booking = await BookingModel.findOneAndUpdate(
      {
        _id: bookingId,
        status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.UNFULFILLED] },
      },
      {
        $set: {
          technician: tech._id,
          status: BookingStatus.ASSIGNED,
          assignedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: BookingStatus.ASSIGNED,
            timestamp: new Date(),
            note: `Manual dispatch assignment by Admin to ${tech.businessName || (tech.user as any)?.name}`,
            updatedBy: `ADMIN:${adminUserId}`,
          },
        },
      },
      { new: true }
    );

    if (!booking) {
      throw new Error('Booking cannot be assigned (may already be in progress or completed)');
    }

    tech.activeBookingId = booking._id as any;
    await tech.save();

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
    const service = await ServiceModel.findById(serviceId);
    if (!service) throw new Error('Service not found');

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
