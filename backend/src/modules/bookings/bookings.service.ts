import mongoose from 'mongoose';
import { BookingModel, IBooking } from '../../models/Booking';
import { VehicleModel } from '../../models/Vehicle';
import { ServiceModel } from '../../models/Service';
import { TechnicianModel } from '../../models/Technician';
import { DispatchOfferModel } from '../../models/DispatchOffer';
import { NotificationModel } from '../../models/Notification';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  BookingStatus,
  DispatchOfferStatus,
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
    if (!mongoose.Types.ObjectId.isValid(input.vehicleId)) {
      const err: any = new Error('Invalid vehicle ID.');
      err.statusCode = 400;
      throw err;
    }
    if (!mongoose.Types.ObjectId.isValid(input.serviceId)) {
      const err: any = new Error('Invalid service ID.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Verify vehicle exists and belongs to customer
    const vehicle = await VehicleModel.findOne({ _id: input.vehicleId, owner: customerId });
    if (!vehicle) {
      const err: any = new Error('Selected vehicle not found or does not belong to you.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Verify service exists and supports vehicle
    const service = await ServiceModel.findById(input.serviceId);
    if (!service || !service.isActive) {
      const err: any = new Error('Selected service is not currently available.');
      err.statusCode = 400;
      throw err;
    }

    if (!service.supportedVehicles.includes(vehicle.vehicleType)) {
      const err: any = new Error(
        `Service '${service.name}' does not support vehicle type ${vehicle.vehicleType}.`
      );
      err.statusCode = 400;
      throw err;
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

    // 4. Trigger dispatch engine and await initial transition so caller receives accurate status
    try {
      await DispatchService.initiateDispatch(booking._id.toString());
    } catch (err) {
      logger.error(`[Bookings] Dispatch failure for booking ${booking._id}:`, err);
    }

    const updatedBooking = await BookingModel.findById(booking._id)
      .populate('service')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name phone avatarUrl' },
      });

    return updatedBooking || booking;
  }

  static async getBookingById(bookingId: string, userId: string, role: UserRole): Promise<IBooking> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking identifier');
      err.statusCode = 400;
      err.code = 'INVALID_ID';
      throw err;
    }

    const booking = await BookingModel.findById(bookingId)
      .populate('customer', 'name phone email emergencyContactPhone')
      .populate('service')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name phone avatarUrl' },
      });

    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Authorization: customer, assigned technician, or admin/dispatcher
    const isCustomer =
      (booking.customer as any)?._id?.toString() === userId ||
      booking.customer?.toString() === userId;
    const isAssignedTech = Boolean(
      booking.technician &&
        ((booking.technician as any).user?._id?.toString() === userId ||
          (booking.technician as any).user?.toString() === userId)
    );
    const isAdmin = role === UserRole.ADMIN || role === UserRole.DISPATCHER;

    if (!isCustomer && !isAssignedTech && !isAdmin) {
      const err: any = new Error('Access denied to this booking.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
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
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking identifier');
      err.statusCode = 400;
      throw err;
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    // Authorization check: only booking owner, assigned technician, or admin/dispatcher can cancel
    const isCustomer = booking.customer.toString() === userId;
    const isAdmin = role === UserRole.ADMIN || role === UserRole.DISPATCHER;
    let isAssignedTech = false;

    if (role === UserRole.TECHNICIAN && booking.technician) {
      const tech = await TechnicianModel.findOne({ user: userId });
      if (tech && booking.technician.toString() === tech._id.toString()) {
        isAssignedTech = true;
      }
    }

    if (!isCustomer && !isAssignedTech && !isAdmin) {
      const err: any = new Error('Access denied: you are not authorized to cancel this booking.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const validation = validateBookingTransition(booking.status, BookingStatus.CANCELLED);
    if (!validation.valid) {
      const err: any = new Error(validation.reason);
      err.statusCode = 400;
      throw err;
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

    // Expire any pending dispatch offers for this booking
    await DispatchOfferModel.updateMany(
      { booking: booking._id, status: DispatchOfferStatus.PENDING },
      { $set: { status: DispatchOfferStatus.EXPIRED, respondedAt: new Date() } }
    );

    // If a technician was assigned, free them up
    if (booking.technician) {
      await TechnicianModel.findByIdAndUpdate(booking.technician, {
        $unset: { activeBookingId: 1 },
      });
    }

    await booking.save();

    // Notify participants
    this.emitEvent(booking._id.toString(), SOCKET_EVENTS.BOOKING_CANCELLED, {
      bookingId: booking._id.toString(),
      status: BookingStatus.CANCELLED,
      reason,
    });
    this.emitStatusUpdate(booking._id.toString(), BookingStatus.CANCELLED, { reason });

    return booking;
  }

  static async retryDispatch(
    bookingId: string,
    userId: string,
    role: UserRole
  ): Promise<IBooking> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking identifier');
      err.statusCode = 400;
      throw err;
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    const isCustomer = booking.customer.toString() === userId;
    const isAdmin = role === UserRole.ADMIN || role === UserRole.DISPATCHER;
    if (!isCustomer && !isAdmin) {
      const err: any = new Error('Access denied: only the customer or an administrator can retry dispatch.');
      err.statusCode = 403;
      throw err;
    }

    if (
      booking.status !== BookingStatus.UNFULFILLED &&
      booking.status !== BookingStatus.SEARCHING &&
      booking.status !== BookingStatus.REQUESTED
    ) {
      const err: any = new Error(`Cannot retry dispatch when booking is in status '${booking.status}'`);
      err.statusCode = 400;
      throw err;
    }

    // Clear previous rejected/expired offers so a fresh round can contact newly online technicians
    await DispatchOfferModel.deleteMany({
      booking: booking._id,
      status: { $in: [DispatchOfferStatus.REJECTED, DispatchOfferStatus.EXPIRED] },
    });

    await DispatchService.initiateDispatch(booking._id.toString());

    const updated = await BookingModel.findById(booking._id)
      .populate('service')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name phone avatarUrl' },
      });

    return updated || booking;
  }

  static async proposeQuoteRevision(
    bookingId: string,
    technicianUserId: string,
    revisedAmount: number,
    reason: string
  ): Promise<IBooking> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) {
      const err: any = new Error('Technician profile not found');
      err.statusCode = 404;
      throw err;
    }

    const booking = await BookingModel.findOne({ _id: bookingId, technician: tech._id });
    if (!booking) {
      const err: any = new Error('Booking not found or not assigned to you');
      err.statusCode = 403;
      throw err;
    }

    if (booking.status !== BookingStatus.INSPECTING) {
      const err: any = new Error(
        `Quote revision can only be proposed during 'INSPECTING' stage (Current: ${booking.status})`
      );
      err.statusCode = 400;
      throw err;
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

    await NotificationModel.create({
      recipient: booking.customer,
      title: 'Revised Repair Estimate Proposed',
      body: `Technician proposed a revised quote of ₹${revisedAmount}: ${reason}`,
      type: 'QUOTE_REVISION',
      data: { bookingId: booking._id.toString(), revisedAmount, reason },
    });

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
    if (!booking) {
      const err: any = new Error('Booking not found or does not belong to you');
      err.statusCode = 403;
      throw err;
    }

    if (booking.status !== BookingStatus.AWAITING_CUSTOMER_APPROVAL) {
      const err: any = new Error(
        `Booking is not awaiting customer quote approval (Current: ${booking.status})`
      );
      err.statusCode = 400;
      throw err;
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
    this.emitStatusUpdate(booking._id.toString(), booking.status, {
      approved,
      approvedFinalAmount: booking.approvedFinalAmount,
    });

    return booking;
  }

  static async updateJobStatus(
    bookingId: string,
    technicianUserId: string,
    nextStatus: BookingStatus,
    notes?: string
  ): Promise<IBooking> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) {
      const err: any = new Error('Technician profile not found');
      err.statusCode = 404;
      throw err;
    }

    const booking = await BookingModel.findOne({ _id: bookingId, technician: tech._id });
    if (!booking) {
      const err: any = new Error('Booking not found or not assigned to you');
      err.statusCode = 403;
      throw err;
    }

    // State machine check
    const validation = validateBookingTransition(booking.status, nextStatus);
    if (!validation.valid) {
      const err: any = new Error(validation.reason);
      err.statusCode = 400;
      throw err;
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
      await TechnicianModel.findByIdAndUpdate(tech._id, {
        $unset: { activeBookingId: 1 },
        $inc: { totalJobsCompleted: 1 },
      });
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
