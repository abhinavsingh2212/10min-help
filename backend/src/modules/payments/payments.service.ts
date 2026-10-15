import mongoose from 'mongoose';
import { BookingModel } from '../../models/Booking';
import { PaymentModel, IPayment } from '../../models/Payment';
import { TechnicianModel } from '../../models/Technician';
import { AuditLogModel } from '../../models/AuditLog';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  SOCKET_EVENTS,
  TechnicianVerificationStatus,
  UserRole,
} from '@10min-help/shared';
import { verifyHmacSignature, verifyWebhookSignature } from '../../utils/crypto';
import { ENV } from '../../config/env';
import { getSocketServer } from '../../sockets';
import { logger } from '../../config/logger';

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: string;
  created_at: number;
}

export class PaymentsService {
  /**
   * Helper to create real Razorpay Order via authenticated REST API
   */
  private static async createRazorpayOrder(
    amountInPaise: number,
    currency: string,
    receipt: string,
    notes: Record<string, string>
  ): Promise<RazorpayOrderResponse> {
    if (!ENV.PAYMENT_KEY_ID || !ENV.PAYMENT_KEY_SECRET) {
      const err: any = new Error('Razorpay credentials missing. Please configure PAYMENT_KEY_ID and PAYMENT_KEY_SECRET.');
      err.statusCode = 500;
      throw err;
    }

    const auth = Buffer.from(`${ENV.PAYMENT_KEY_ID}:${ENV.PAYMENT_KEY_SECRET}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data?.error?.description || data?.message || 'Razorpay API returned an error';
      logger.error(`[Payments] Razorpay order creation failed: ${errorMsg}`, data);
      const err: any = new Error(`Payment gateway order creation failed: ${errorMsg}`);
      err.statusCode = response.status || 502;
      err.code = 'GATEWAY_ERROR';
      throw err;
    }

    return data as RazorpayOrderResponse;
  }

  static async createOrder(
    bookingId: string,
    customerId: string,
    method: PaymentMethod
  ): Promise<{ orderId: string; providerOrderId: string; amount: number; currency: string; keyId: string; provider: string }> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking ID');
      err.statusCode = 400;
      throw err;
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    if (booking.customer.toString() !== customerId) {
      const err: any = new Error('Access denied: you can only create payments for your own bookings.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.UNFULFILLED) {
      const err: any = new Error(`Cannot initiate payment for a ${booking.status} booking.`);
      err.statusCode = 400;
      throw err;
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      const err: any = new Error('Payment has already been completed for this booking.');
      err.statusCode = 409;
      err.code = 'ALREADY_PAID';
      throw err;
    }

    const amount = booking.approvedFinalAmount || booking.quotedPrice;
    if (!amount || amount <= 0) {
      const err: any = new Error('Invalid booking service amount.');
      err.statusCode = 400;
      throw err;
    }

    // Reuse existing pending order for the same booking, amount, and method to prevent duplicate orders
    const existingPending = await PaymentModel.findOne({
      booking: booking._id,
      customer: customerId,
      status: PaymentStatus.PENDING,
      amount,
      method,
    }).sort({ createdAt: -1 });

    if (existingPending && existingPending.providerOrderId) {
      return {
        orderId: existingPending.providerOrderId,
        providerOrderId: existingPending.providerOrderId,
        amount: existingPending.amount,
        currency: existingPending.currency,
        keyId: ENV.PAYMENT_KEY_ID,
        provider: existingPending.provider,
      };
    }

    let providerOrderId: string;

    if (ENV.PAYMENT_PROVIDER === 'razorpay') {
      const amountInPaise = Math.round(amount * 100);
      const receipt = `rcpt_${booking._id.toString().slice(-8)}_${Date.now()}`;
      const rzpOrder = await this.createRazorpayOrder(amountInPaise, 'INR', receipt, {
        bookingId: booking._id.toString(),
        customerId: customerId.toString(),
      });
      providerOrderId = rzpOrder.id;
    } else {
      if (ENV.NODE_ENV === 'production') {
        const err: any = new Error('Mock payment provider is strictly disallowed in production mode.');
        err.statusCode = 500;
        throw err;
      }
      providerOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    await PaymentModel.create({
      booking: booking._id,
      customer: new mongoose.Types.ObjectId(customerId),
      amount,
      currency: 'INR',
      status: PaymentStatus.PENDING,
      method,
      provider: ENV.PAYMENT_PROVIDER,
      providerOrderId,
    });

    return {
      orderId: providerOrderId,
      providerOrderId,
      amount,
      currency: 'INR',
      keyId: ENV.PAYMENT_KEY_ID,
      provider: ENV.PAYMENT_PROVIDER,
    };
  }

  static async verifyPayment(
    bookingId: string,
    customerId: string,
    providerOrderId: string,
    providerPaymentId: string,
    signature: string
  ): Promise<IPayment> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking ID');
      err.statusCode = 400;
      throw err;
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    // Enforce booking ownership
    if (booking.customer.toString() !== customerId) {
      const err: any = new Error('Access denied: you are not authorized to verify payment for this booking.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Require exact providerOrderId match with fallback to latest pending payment for same booking
    let payment = await PaymentModel.findOne({
      booking: bookingId,
      providerOrderId,
    });

    if (!payment) {
      payment = await PaymentModel.findOne({
        booking: bookingId,
        status: PaymentStatus.PENDING,
      }).sort({ createdAt: -1 });
    }

    if (!payment) {
      const err: any = new Error('Payment order not found for this booking.');
      err.statusCode = 404;
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }

    // Idempotency & replay check
    if (payment.status === PaymentStatus.PAID) {
      if (payment.providerPaymentId === providerPaymentId) {
        return payment;
      }
      const err: any = new Error('This payment order has already been settled with another transaction.');
      err.statusCode = 409;
      err.code = 'DUPLICATE_PAYMENT';
      throw err;
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      const err: any = new Error('Booking is already marked as paid.');
      err.statusCode = 409;
      err.code = 'ALREADY_PAID';
      throw err;
    }

    // Prevent replaying the same providerPaymentId across different orders
    const replayedPayment = await PaymentModel.findOne({
      providerPaymentId,
      status: PaymentStatus.PAID,
      _id: { $ne: payment._id },
    });
    if (replayedPayment) {
      const err: any = new Error('Duplicate or replayed payment ID detected.');
      err.statusCode = 409;
      err.code = 'REPLAYED_PAYMENT_ID';
      throw err;
    }

    // Verify expected amount matches booking's current approved amount
    const expectedAmount = booking.approvedFinalAmount || booking.quotedPrice;
    if (expectedAmount && payment.amount !== expectedAmount) {
      const err: any = new Error(
        `Payment amount mismatch: stored payment amount (₹${payment.amount}) does not match current required booking amount (₹${expectedAmount}). Re-initiate checkout.`
      );
      err.statusCode = 409;
      err.code = 'PAYMENT_AMOUNT_MISMATCH';
      throw err;
    }

    // Cryptographic signature check
    const isValid = verifyHmacSignature(payment.providerOrderId || providerOrderId, providerPaymentId, signature);
    if (!isValid) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Cryptographic signature mismatch';
      await payment.save();
      const err: any = new Error('Payment signature verification failed. Potential tampering detected.');
      err.statusCode = 400;
      err.code = 'INVALID_SIGNATURE';
      throw err;
    }

    payment.status = PaymentStatus.PAID;
    payment.providerPaymentId = providerPaymentId;
    payment.providerSignature = signature;
    payment.paidAt = new Date();
    await payment.save();

    // Update booking payment state
    booking.paymentStatus = PaymentStatus.PAID;
    booking.paymentMethod = payment.method;
    await booking.save();

    await AuditLogModel.create({
      actorId: new mongoose.Types.ObjectId(customerId),
      actorRole: UserRole.CUSTOMER,
      action: 'PAYMENT_VERIFIED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      metadata: {
        bookingId,
        providerOrderId: payment.providerOrderId,
        providerPaymentId,
        amount: payment.amount,
        method: payment.method,
      },
    });

    // Notify room
    const io = getSocketServer();
    if (io) {
      const payload = {
        bookingId,
        paymentStatus: PaymentStatus.PAID,
        amount: payment.amount,
        paymentId: providerPaymentId,
        method: payment.method,
      };
      io.to(`booking:${bookingId}`).emit(SOCKET_EVENTS.PAYMENT_UPDATED, payload);
      io.to('admin:dispatch').emit(SOCKET_EVENTS.PAYMENT_UPDATED, payload);
    }

    logger.info(
      `[Payments] Verified payment ${providerPaymentId} for booking ${bookingId} (₹${payment.amount})`
    );
    return payment;
  }

  static async recordCashPayment(
    bookingId: string,
    technicianUserId: string,
    notes?: string
  ): Promise<IPayment> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking ID');
      err.statusCode = 400;
      throw err;
    }

    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) {
      const err: any = new Error('Technician profile not found');
      err.statusCode = 404;
      throw err;
    }

    if (tech.verificationStatus !== TechnicianVerificationStatus.VERIFIED) {
      const err: any = new Error('Only verified technicians are permitted to record cash payments.');
      err.statusCode = 403;
      err.code = 'UNVERIFIED_TECHNICIAN';
      throw err;
    }

    const booking = await BookingModel.findOne({ _id: bookingId, technician: tech._id });
    if (!booking) {
      const err: any = new Error('Booking not found or not assigned to you');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.UNFULFILLED) {
      const err: any = new Error(`Cannot record cash payment for a ${booking.status} booking.`);
      err.statusCode = 400;
      throw err;
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      const existingPaid = await PaymentModel.findOne({
        booking: booking._id,
        status: PaymentStatus.PAID,
      });
      if (existingPaid && existingPaid.method === PaymentMethod.CASH) {
        return existingPaid;
      }
      const err: any = new Error('Booking has already been paid.');
      err.statusCode = 409;
      err.code = 'ALREADY_PAID';
      throw err;
    }

    const amount = booking.approvedFinalAmount || booking.quotedPrice;

    const payment = await PaymentModel.create({
      booking: booking._id,
      customer: booking.customer,
      amount,
      currency: 'INR',
      status: PaymentStatus.PAID,
      method: PaymentMethod.CASH,
      provider: 'cash_on_delivery',
      providerPaymentId: `cash_${Date.now()}`,
      paidAt: new Date(),
    });

    booking.paymentStatus = PaymentStatus.PAID;
    booking.paymentMethod = PaymentMethod.CASH;
    await booking.save();

    await AuditLogModel.create({
      actorId: tech.user,
      actorRole: UserRole.TECHNICIAN,
      action: 'CASH_PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      metadata: { bookingId, amount, notes },
    });

    const io = getSocketServer();
    if (io) {
      const payload = {
        bookingId,
        paymentStatus: PaymentStatus.PAID,
        amount,
        method: PaymentMethod.CASH,
      };
      io.to(`booking:${bookingId}`).emit(SOCKET_EVENTS.PAYMENT_UPDATED, payload);
      io.to('admin:dispatch').emit(SOCKET_EVENTS.PAYMENT_UPDATED, payload);
    }

    return payment;
  }

  static async getPaymentByBooking(
    bookingId: string,
    userId: string,
    role: UserRole
  ): Promise<IPayment | null> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err: any = new Error('Invalid booking ID');
      err.statusCode = 400;
      throw err;
    }

    const booking = await BookingModel.findById(bookingId).populate('technician');
    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    const isCustomer = booking.customer.toString() === userId;
    const isAssignedTech = Boolean(
      booking.technician &&
        ((booking.technician as any).user?._id?.toString() === userId ||
          (booking.technician as any).user?.toString() === userId)
    );
    const isAdmin = role === UserRole.ADMIN || role === UserRole.DISPATCHER;

    if (!isCustomer && !isAssignedTech && !isAdmin) {
      const err: any = new Error('Access denied to payment details for this booking.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return PaymentModel.findOne({ booking: bookingId }).sort({ createdAt: -1 });
  }

  static async handleRazorpayWebhook(
    rawBody: string,
    signature: string | undefined,
    payload: any
  ): Promise<{ processed: boolean; event?: string; duplicate?: boolean }> {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      const err: any = new Error('Invalid webhook signature');
      err.statusCode = 401;
      err.code = 'INVALID_WEBHOOK_SIGNATURE';
      throw err;
    }

    const event = payload?.event;
    const entity = payload?.payload?.payment?.entity;
    const providerOrderId = entity?.order_id;
    const providerPaymentId = entity?.id;

    if (!providerOrderId) {
      return { processed: true, event };
    }

    const payment = await PaymentModel.findOne({ providerOrderId });
    if (!payment) {
      return { processed: false, event };
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      if (payment.status === PaymentStatus.PAID) {
        return { processed: true, event, duplicate: true };
      }

      // Verify amount matches
      const capturedAmount = entity?.amount ? entity.amount / 100 : payment.amount;
      if (capturedAmount !== payment.amount) {
        logger.warn(`[Payments] Webhook amount mismatch: expected ₹${payment.amount}, received ₹${capturedAmount}`);
      }

      payment.status = PaymentStatus.PAID;
      payment.providerPaymentId = providerPaymentId || payment.providerPaymentId;
      payment.paidAt = new Date();
      await payment.save();

      await BookingModel.findByIdAndUpdate(payment.booking, {
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: payment.method,
      });

      const io = getSocketServer();
      if (io) {
        const socketPayload = {
          bookingId: payment.booking.toString(),
          paymentStatus: PaymentStatus.PAID,
          amount: payment.amount,
          paymentId: payment.providerPaymentId,
        };
        io.to(`booking:${payment.booking}`).emit(SOCKET_EVENTS.PAYMENT_UPDATED, socketPayload);
        io.to('admin:dispatch').emit(SOCKET_EVENTS.PAYMENT_UPDATED, socketPayload);
      }
    } else if (event === 'payment.failed') {
      if (payment.status === PaymentStatus.PENDING) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = entity?.error_description || 'Gateway payment failed';
        await payment.save();
      }
    }

    return { processed: true, event };
  }
}
