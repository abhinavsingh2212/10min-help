import { PaymentsService } from '../../src/modules/payments/payments.service';
import { PaymentModel } from '../../src/models/Payment';
import { BookingModel } from '../../src/models/Booking';
import { PaymentStatus, PaymentMethod } from '@10min-help/shared';
import crypto from 'crypto';
import mongoose from 'mongoose';

describe('Payment Edge Cases & Gateway Verification Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle duplicate payment verification idempotently without double-crediting', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const customerId = new mongoose.Types.ObjectId().toString();
    const orderId = 'order_test_id_123';
    const paymentId = 'pay_test_id_123';

    jest.spyOn(BookingModel, 'findById').mockResolvedValue({
      _id: bookingId,
      customer: customerId,
    } as any);

    // Mock existing payment that is already marked as PAID
    const existingPaid = {
      _id: new mongoose.Types.ObjectId(),
      booking: bookingId,
      customer: customerId,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      amount: 349,
      status: PaymentStatus.PAID,
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(PaymentModel, 'findOne').mockResolvedValue(existingPaid as any);

    // Call verifyPayment
    const result = await PaymentsService.verifyPayment(
      bookingId,
      customerId,
      orderId,
      paymentId,
      'any_signature'
    );

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(result.providerPaymentId).toBe(paymentId);
    // save should not have been called again since it was already PAID
    expect(existingPaid.save).not.toHaveBeenCalled();
  });

  it('should reject payment verification if cryptographic signature is forged', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const customerId = new mongoose.Types.ObjectId().toString();
    const orderId = 'order_test_id_456';
    const paymentId = 'pay_test_id_456';

    jest.spyOn(BookingModel, 'findById').mockResolvedValue({
      _id: bookingId,
      customer: customerId,
    } as any);

    const pendingPayment = {
      _id: new mongoose.Types.ObjectId(),
      booking: bookingId,
      customer: customerId,
      providerOrderId: orderId,
      amount: 499,
      status: PaymentStatus.PENDING,
      failureReason: undefined as string | undefined,
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(PaymentModel, 'findOne')
      .mockResolvedValueOnce(pendingPayment as any)
      .mockResolvedValueOnce(null);

    await expect(
      PaymentsService.verifyPayment(
        bookingId,
        customerId,
        orderId,
        paymentId,
        'fraudulent_signature_value'
      )
    ).rejects.toThrow('Payment signature verification failed.');

    expect(pendingPayment.status).toBe(PaymentStatus.FAILED);
    expect(pendingPayment.failureReason).toBe('Cryptographic signature mismatch');
    expect(pendingPayment.save).toHaveBeenCalled();
  });

  it('should reject payment verification if duplicate or replayed payment ID is detected', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const customerId = new mongoose.Types.ObjectId().toString();
    const orderId = 'order_test_id_789';
    const paymentId = 'pay_replayed_id_789';

    jest.spyOn(BookingModel, 'findById').mockResolvedValue({
      _id: bookingId,
      customer: customerId,
    } as any);

    const pendingPayment = {
      _id: new mongoose.Types.ObjectId(),
      booking: bookingId,
      customer: customerId,
      providerOrderId: orderId,
      amount: 499,
      status: PaymentStatus.PENDING,
      save: jest.fn().mockResolvedValue(true),
    };

    // First call returns pending order, second call detects another booking already paid with this paymentId
    jest.spyOn(PaymentModel, 'findOne')
      .mockResolvedValueOnce(pendingPayment as any)
      .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId(), status: PaymentStatus.PAID } as any);

    await expect(
      PaymentsService.verifyPayment(
        bookingId,
        customerId,
        orderId,
        paymentId,
        'valid_sig'
      )
    ).rejects.toThrow('Duplicate or replayed payment ID detected.');
  });

  it('should handle duplicate webhook events idempotently without throwing', async () => {
    const webhookSecret = 'sampleWebhookSecretForSignatures';
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_dup_1',
            order_id: 'order_rzp_dup_1',
            amount: 24900,
          },
        },
      },
    });

    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    // Mock payment already PAID
    const existingPaid = {
      _id: new mongoose.Types.ObjectId(),
      providerOrderId: 'order_rzp_dup_1',
      amount: 249,
      status: PaymentStatus.PAID,
      save: jest.fn(),
    };

    jest.spyOn(PaymentModel, 'findOne').mockResolvedValue(existingPaid as any);

    const result = await PaymentsService.handleRazorpayWebhook(
      rawBody,
      signature,
      JSON.parse(rawBody)
    );

    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(true);
    expect(existingPaid.save).not.toHaveBeenCalled();
  });

  it('should process payment.failed webhook event and mark payment failed', async () => {
    const webhookSecret = 'sampleWebhookSecretForSignatures';
    const rawBody = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_failed_1',
            order_id: 'order_rzp_failed_1',
            error_description: 'Card declined by issuing bank',
          },
        },
      },
    });

    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const pendingPayment = {
      _id: new mongoose.Types.ObjectId(),
      providerOrderId: 'order_rzp_failed_1',
      status: PaymentStatus.PENDING,
      failureReason: undefined as string | undefined,
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(PaymentModel, 'findOne').mockResolvedValue(pendingPayment as any);

    const result = await PaymentsService.handleRazorpayWebhook(
      rawBody,
      signature,
      JSON.parse(rawBody)
    );

    expect(result.processed).toBe(true);
    expect(pendingPayment.status).toBe(PaymentStatus.FAILED);
    expect(pendingPayment.failureReason).toBe('Card declined by issuing bank');
    expect(pendingPayment.save).toHaveBeenCalled();
  });

  it('should reject webhook with invalid signature', async () => {
    const rawBody = JSON.stringify({ event: 'payment.captured' });
    await expect(
      PaymentsService.handleRazorpayWebhook(rawBody, 'invalid_sig', { event: 'payment.captured' })
    ).rejects.toThrow('Invalid webhook signature');
  });
});
