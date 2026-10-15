import mongoose from 'mongoose';
import { BookingModel, IBooking } from '../../models/Booking';
import { PaymentModel } from '../../models/Payment';
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

  static async getInvoice(bookingId: string, userId: string, role: UserRole) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking ID');
      err.statusCode = 400;
      throw err;
    }

    const booking = await BookingModel.findById(bookingId)
      .populate('customer', 'name phone email')
      .populate('service', 'name category')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name phone' },
      });

    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

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
      const err: any = new Error('Access denied: you are not authorized to view invoice for this booking.');
      err.statusCode = 403;
      throw err;
    }

    const payment = await PaymentModel.findOne({ booking: booking._id }).sort({ createdAt: -1 });

    const totalAmount = booking.approvedFinalAmount || booking.quotedPrice || 0;
    const baseAmount = booking.initialPrice || totalAmount;
    const additionalRepairs = Math.max(0, totalAmount - baseAmount);
    const netAmount = Math.round((totalAmount / 1.18) * 100) / 100;
    const totalGst = Math.round((totalAmount - netAmount) * 100) / 100;
    const cgst = Math.round((totalGst / 2) * 100) / 100;
    const sgst = Math.round((totalGst / 2) * 100) / 100;

    const invoiceNumber = `INV-${booking._id.toString().slice(-8).toUpperCase()}`;
    const invoiceDate = payment?.paidAt || booking.completedAt || (booking as any).updatedAt || new Date();

    const customerData = booking.customer as any;
    const techData = booking.technician as any;
    const serviceData = booking.service as any;

    const invoiceData = {
      invoiceNumber,
      invoiceDate: new Date(invoiceDate).toISOString(),
      bookingId: booking._id.toString(),
      status: booking.status,
      customer: {
        id: customerData?._id?.toString() || '',
        name: customerData?.name || 'Customer',
        phone: customerData?.phone || '',
        email: customerData?.email || '',
      },
      technician: {
        id: techData?._id?.toString() || '',
        name: techData?.businessName || techData?.user?.name || 'Verified Technician Partner',
        phone: techData?.user?.phone || '',
      },
      vehicle: {
        manufacturer: booking.vehicle?.manufacturer || '',
        model: booking.vehicle?.model || '',
        registrationNumber: booking.vehicle?.registrationNumber || 'N/A',
        vehicleType: booking.vehicle?.vehicleType || '',
      },
      service: {
        name: serviceData?.name || 'Emergency Roadside Assistance',
        category: serviceData?.category || 'ROADSIDE_ASSISTANCE',
      },
      breakdown: {
        baseServiceFee: baseAmount,
        additionalRepairsOrSpares: additionalRepairs,
        quoteRevisionReason: booking.quoteRevisionReason || null,
        taxableAmount: netAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        gstRatePercent: 18,
        totalAmount,
        currency: 'INR',
      },
      payment: {
        status: booking.paymentStatus,
        method: booking.paymentMethod || payment?.method || 'N/A',
        providerOrderId: payment?.providerOrderId || 'N/A',
        providerPaymentId: payment?.providerPaymentId || 'N/A',
        paidAt: payment?.paidAt ? new Date(payment.paidAt).toISOString() : null,
      },
    };

    const htmlReceipt = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoiceNumber} - 10Min Help</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #f8fafc; }
    .invoice-card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #0284c7; }
    .subbrand { font-size: 13px; color: #64748b; margin-top: 4px; }
    .inv-details { text-align: right; }
    .inv-number { font-size: 18px; font-weight: 700; color: #0f172a; }
    .inv-date { font-size: 13px; color: #64748b; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .party { width: 48%; font-size: 14px; line-height: 1.5; }
    .party-title { font-weight: 700; color: #334155; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 10px 12px; background: #f1f5f9; color: #475569; font-size: 13px; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 280px; font-size: 14px; margin-bottom: 24px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 6px; }
    .payment-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: ${booking.paymentStatus === PaymentStatus.PAID ? '#dcfce7; color: #15803d;' : '#fef3c7; color: #b45309;'} }
    .print-btn { background: #0284c7; color: #ffffff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 20px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">10Min Help</div>
        <div class="subbrand">Rapid Roadside Assistance India<br>GSTIN: 29AABCU9603R1ZX</div>
      </div>
      <div class="inv-details">
        <div class="inv-number">${invoiceNumber}</div>
        <div class="inv-date">Date: ${new Date(invoiceDate).toLocaleDateString('en-IN')}</div>
        <div style="margin-top: 8px;"><span class="payment-badge">${booking.paymentStatus}</span></div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Billed To</div>
        <strong>${customerData?.name || 'Customer'}</strong><br>
        Phone: ${customerData?.phone || 'N/A'}<br>
        Vehicle: ${booking.vehicle?.manufacturer || ''} ${booking.vehicle?.model || ''} (${booking.vehicle?.registrationNumber || 'N/A'})
      </div>
      <div class="party">
        <div class="party-title">Serviced By</div>
        <strong>${techData?.businessName || techData?.user?.name || 'Verified Technician Partner'}</strong><br>
        Partner Phone: ${techData?.user?.phone || 'N/A'}<br>
        Booking Ref: ${booking._id.toString()}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${serviceData?.name || 'Roadside Assistance Service'} (${booking.vehicle?.vehicleType})</td>
          <td class="text-right">₹${baseAmount}</td>
          <td class="text-right">₹${baseAmount}</td>
        </tr>
        ${additionalRepairs > 0 ? `
        <tr>
          <td>Additional Parts / Repairs (${booking.quoteRevisionReason || 'Approved revision'})</td>
          <td class="text-right">₹${additionalRepairs}</td>
          <td class="text-right">₹${additionalRepairs}</td>
        </tr>` : ''}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Taxable Value:</span><span>₹${netAmount.toFixed(2)}</span></div>
      <div class="total-row"><span>CGST (9%):</span><span>₹${cgst.toFixed(2)}</span></div>
      <div class="total-row"><span>SGST (9%):</span><span>₹${sgst.toFixed(2)}</span></div>
      <div class="total-row grand-total"><span>Total Paid:</span><span>₹${totalAmount.toFixed(2)}</span></div>
    </div>

    <div style="font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      Payment Method: <strong>${booking.paymentMethod || payment?.method || 'N/A'}</strong> |
      Ref / Order ID: <strong>${payment?.providerOrderId || payment?.providerPaymentId || 'N/A'}</strong>
    </div>

    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>
    `.trim();

    return {
      ...invoiceData,
      htmlReceipt,
    };
  }
}
