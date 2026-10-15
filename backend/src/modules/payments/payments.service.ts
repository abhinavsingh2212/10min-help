import mongoose from 'mongoose';
import { BookingModel } from '../../models/Booking';
import { PaymentModel, IPayment } from '../../models/Payment';
import { TechnicianModel } from '../../models/Technician';
import { PaymentMethod, PaymentStatus, SOCKET_EVENTS } from '@10min-help/shared';
import { verifyHmacSignature } from '../../utils/crypto';
import { ENV } from '../../config/env';
import { getSocketServer } from '../../sockets';
import { logger } from '../../config/logger';

export class PaymentsService {
  static async createOrder(
    bookingId: string,
    customerId: string,
    method: PaymentMethod
  ): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
    const booking = await BookingModel.findOne({ _id: bookingId, customer: customerId });
    if (!booking) throw new Error('Booking not found');

    const amount = booking.approvedFinalAmount || booking.quotedPrice;

    // Generate provider order ID (Razorpay format: order_xxxxx)
    const providerOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
      amount,
      currency: 'INR',
      keyId: ENV.PAYMENT_KEY_ID,
    };
  }

  static async verifyPayment(
    bookingId: string,
    customerId: string,
    providerOrderId: string,
    providerPaymentId: string,
    signature: string
  ): Promise<IPayment> {
    const payment = await PaymentModel.findOne({
      booking: bookingId,
      providerOrderId,
    });

    if (!payment) throw new Error('Payment record not found for this order.');

    // Cryptographic signature check
    const isValid = verifyHmacSignature(providerOrderId, providerPaymentId, signature);
    if (!isValid) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Cryptographic signature mismatch';
      await payment.save();
      throw new Error('Payment signature verification failed. Potential tampering detected.');
    }

    payment.status = PaymentStatus.PAID;
    payment.providerPaymentId = providerPaymentId;
    payment.providerSignature = signature;
    payment.paidAt = new Date();
    await payment.save();

    // Update booking payment state
    await BookingModel.findByIdAndUpdate(bookingId, {
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: payment.method,
    });

    // Notify room
    const io = getSocketServer();
    if (io) {
      io.to(`booking:${bookingId}`).emit(SOCKET_EVENTS.PAYMENT_UPDATED, {
        bookingId,
        paymentStatus: PaymentStatus.PAID,
        amount: payment.amount,
        paymentId: providerPaymentId,
      });
    }

    logger.info(`[Payments] Verified payment ${providerPaymentId} for booking ${bookingId} (₹${payment.amount})`);
    return payment;
  }

  static async recordCashPayment(bookingId: string, technicianUserId: string): Promise<IPayment> {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) throw new Error('Technician profile not found');

    const booking = await BookingModel.findOne({ _id: bookingId, technician: tech._id });
    if (!booking) throw new Error('Booking not found or not assigned to you');

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

    const io = getSocketServer();
    if (io) {
      io.to(`booking:${bookingId}`).emit(SOCKET_EVENTS.PAYMENT_UPDATED, {
        bookingId,
        paymentStatus: PaymentStatus.PAID,
        amount,
        method: PaymentMethod.CASH,
      });
    }

    return payment;
  }

  static async getPaymentByBooking(bookingId: string): Promise<IPayment | null> {
    return PaymentModel.findOne({ booking: bookingId }).sort({ createdAt: -1 });
  }
}
