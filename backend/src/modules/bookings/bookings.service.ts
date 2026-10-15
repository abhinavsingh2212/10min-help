import mongoose from 'mongoose';
import { BookingModel, IBooking } from '../../models/Booking';
import { VehicleModel } from '../../models/Vehicle';
import { ServiceModel } from '../../models/Service';
import { TechnicianModel } from '../../models/Technician';
import { AuditLogModel } from '../../models/AuditLog';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  BookingStatus,
  PaymentStatus,
  SOCKET_EVENTS,
  UserRole,
  validateBookingTransition,
} from '@10min-help/shared';
import { getSocketServer } from '../../sockets';
import { logger } from '../../config/logger';

export interface CreateBookingInput {
  vehicleId: string;
  serviceId: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
    city?: string;
  };
  notes?: string;
}

export class BookingsService {
  static async createBooking(customerId: string, input: CreateBookingInput): Promise<IBooking> {
    // 1. Verify vehicle exists and belongs to customer
    const vehicle = await VehicleModel.findOne({ _id: input.vehicleId, owner: customerId });
    if (!vehicle) {
      throw new Error('Selected vehicle not found or does not belong to you.');
    }

    // 2. Verify service exists and supports vehicle
    const service = await ServiceModel.findById(input.serviceId);
    if (!service || !service.isActive) {
      throw new Error('Selected service is not currently available.');
    }

    if (!service.supportedVehicles.includes(vehicle.vehicleType)) {
      throw new Error(`Service '${service.name}' does not support vehicle type ${vehicle.vehicleType}.`);
    }

    const startingPrice = service.startingPrice[vehicle.vehicleType];

    // 3. Create booking document
    const booking = await BookingModel.create({
      customer: new mongoose.Types.ObjectId(customerId),
      vehicle: {
        vehicleId: vehicle._id,
        vehicleType: vehicle.vehicleType,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        registrationNumber: vehicle.registrationNumber,
        color: vehicle.color,
      },
      service: service._id,
      pickupLocation: {
        type: 'Point',
        coordinates: [input.pickupLocation.longitude, input.pickupLocation.latitude],
        address: input.pickupLocation.address,
        landmark: input.pickupLocation.landmark,
        city: input.pickupLocation.city,
      },
      status: BookingStatus.REQUESTED,
      initialPrice: startingPrice,
      quotedPrice: startingPrice,
      approvedFinalAmount: startingPrice,
      isQuoteApprovedByCustomer: true,
      notes: input.notes,
      paymentStatus: PaymentStatus.PENDING,
      requestedAt: new Date(),
      statusHistory: [
        {
          status: BookingStatus.REQUESTED,
          timestamp: new Date(),
          note: 'Booking requested by customer',
          updatedBy: customerId,
        },
      ],
    });

    // 4. Immediately trigger dispatch engine
    DispatchService.initiateDispatch(booking._id.toString()).catch((err) => {
      logger.error(`[Bookings] Dispatch failure for booking ${booking._id}:`, err);
    });

    return booking;
  }

  static async getBookingById(bookingId: string, userId: string, role: UserRole): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId)
      .populate('customer', 'name phone email emergencyContactPhone')
      .populate('service')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name phone avatarUrl' },
      });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Authorization: customer, assigned technician, or admin/dispatcher
    const isCustomer = (booking.customer as any)._id?.toString() === userId || booking.customer.toString() === userId;
    const isAssignedTech = booking.technician && ((booking.technician as any).user?._id?.toString() === userId || (booking.technician as any).user?.toString() === userId);
    const isAdmin = role === UserRole.ADMIN || role === UserRole.DISPATCHER;

    if (!isCustomer && !isAssignedTech && !isAdmin) {
      throw new Error('Access denied to this booking.');
    }

    return booking;
  }

  static async listCustomerBookings(customerId: string): Promise<IBooking[]> {
    return BookingModel.find({ customer: customerId })
      .populate('service')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name phone' },
      })
      .sort({ createdAt: -1 });
  }

  static async cancelBooking(
    bookingId: string,
    userId: string,
    role: UserRole,
    reason: string
  ): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const validation = validateBookingTransition(booking.status, BookingStatus.CANCELLED);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason;
    booking.cancelledBy = `${role}:${userId}`;
    booking.cancelledAt = new Date();
    booking.statusHistory.push({
      status: BookingStatus.CANCELLED,
      timestamp: new Date(),
      note: `Cancelled: ${reason}`,
      updatedBy: userId,
    });

    // If a technician was assigned, free them up
    if (booking.technician) {
      await TechnicianModel.findByIdAndUpdate(booking.technician, {
        $unset: { activeBookingId: 1 },
      });
    }

    await booking.save();

    // Notify participants
    this.emitStatusUpdate(booking._id.toString(), BookingStatus.CANCELLED, { reason });

    return booking;
  }

  static async proposeQuoteRevision(
    bookingId: string,
    technicianUserId: string,
    revisedAmount: number,
    reason: string
  ): Promise<IBooking> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) throw new Error('Technician profile not found');

    const booking = await BookingModel.findOne({ _id: bookingId, technician: tech._id });
    if (!booking) throw new Error('Booking not found or not assigned to you');

    if (booking.status !== BookingStatus.INSPECTING) {
      throw new Error(`Quote revision can only be proposed during 'INSPECTING' stage (Current: ${booking.status})`);
    }

    booking.status = BookingStatus.AWAITING_CUSTOMER_APPROVAL;
    booking.quotedPrice = revisedAmount;
    booking.quoteRevisionReason = reason;
    booking.isQuoteApprovedByCustomer = false;
    booking.statusHistory.push({
      status: BookingStatus.AWAITING_CUSTOMER_APPROVAL,
      timestamp: new Date(),
      note: `Technician revised quote to ₹${revisedAmount}. Reason: ${reason}`,
      updatedBy: tech._id.toString(),
    });

    await booking.save();

    // Real-time alert to customer
    this.emitEvent(booking._id.toString(), SOCKET_EVENTS.BOOKING_QUOTE_UPDATED, {
      bookingId: booking._id.toString(),
      status: BookingStatus.AWAITING_CUSTOMER_APPROVAL,
      revisedAmount,
      reason,
    });

    return booking;
  }

  static async respondToQuoteRevision(
    bookingId: string,
    customerId: string,
    approved: boolean,
    notes?: string
  ): Promise<IBooking> {
    const booking = await BookingModel.findOne({ _id: bookingId, customer: customerId });
    if (!booking) throw new Error('Booking not found');

    if (booking.status !== BookingStatus.AWAITING_CUSTOMER_APPROVAL) {
      throw new Error(`Booking is not awaiting customer quote approval (Current: ${booking.status})`);
    }

    if (approved) {
      booking.status = BookingStatus.IN_PROGRESS;
      booking.approvedFinalAmount = booking.quotedPrice;
      booking.isQuoteApprovedByCustomer = true;
      booking.startedAt = new Date();
      booking.statusHistory.push({
        status: BookingStatus.IN_PROGRESS,
        timestamp: new Date(),
        note: `Customer approved revised quote of ₹${booking.approvedFinalAmount}. Repair started.`,
        updatedBy: customerId,
      });
    } else {
      booking.status = BookingStatus.CANCELLED;
      booking.cancellationReason = notes || 'Customer declined revised quotation after inspection.';
      booking.cancelledAt = new Date();
      booking.cancelledBy = `CUSTOMER:${customerId}`;
      booking.statusHistory.push({
        status: BookingStatus.CANCELLED,
        timestamp: new Date(),
        note: booking.cancellationReason,
        updatedBy: customerId,
      });

      if (booking.technician) {
        await TechnicianModel.findByIdAndUpdate(booking.technician, {
          $unset: { activeBookingId: 1 },
        });
      }
    }

    await booking.save();
    this.emitStatusUpdate(booking._id.toString(), booking.status, { approved });

    return booking;
  }

  static async updateJobStatus(
    bookingId: string,
    technicianUserId: string,
    nextStatus: BookingStatus,
    notes?: string
  ): Promise<IBooking> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) throw new Error('Technician profile not found');

    const booking = await BookingModel.findOne({ _id: bookingId, technician: tech._id });
    if (!booking) throw new Error('Booking not found or not assigned to you');

    // State machine check
    const validation = validateBookingTransition(booking.status, nextStatus);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    booking.status = nextStatus;
    const now = new Date();

    if (nextStatus === BookingStatus.ARRIVED) {
      booking.arrivedAt = now;
    } else if (nextStatus === BookingStatus.IN_PROGRESS) {
      booking.startedAt = now;
    } else if (nextStatus === BookingStatus.COMPLETED) {
      booking.completedAt = now;
      // Free technician active job & increment count
      tech.activeBookingId = undefined;
      tech.totalJobsCompleted += 1;
      await tech.save();
    }

    booking.statusHistory.push({
      status: nextStatus,
      timestamp: now,
      note: notes || `Technician updated status to ${nextStatus}`,
      updatedBy: tech._id.toString(),
    });

    await booking.save();
    this.emitStatusUpdate(booking._id.toString(), nextStatus, { notes });

    return booking;
  }

  private static emitStatusUpdate(bookingId: string, status: BookingStatus, extra?: Record<string, unknown>) {
    this.emitEvent(bookingId, SOCKET_EVENTS.BOOKING_STATUS, {
      bookingId,
      status,
      ...extra,
    });
  }

  private static emitEvent(bookingId: string, event: string, payload: unknown) {
    const io = getSocketServer();
    if (io) {
      io.to(`booking:${bookingId}`).emit(event, payload);
      io.to('admin:dispatch').emit(event, payload);
    }
  }
}
