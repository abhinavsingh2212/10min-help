import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { sendSuccess, sendError } from '../../utils/response';

export class PaymentsController {
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId, method } = req.body;
      const order = await PaymentsService.createOrder(bookingId, req.user!.userId, method);
      return sendSuccess(res, order, 'Payment order created');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId, providerOrderId, providerPaymentId, signature } = req.body;
      const payment = await PaymentsService.verifyPayment(
        bookingId,
        req.user!.userId,
        providerOrderId,
        providerPaymentId,
        signature
      );
      return sendSuccess(res, payment, 'Payment verified successfully');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async recordCash(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId, notes } = req.body;
      const payment = await PaymentsService.recordCashPayment(bookingId, req.user!.userId, notes);
      return sendSuccess(res, payment, 'Cash payment recorded');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async getByBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentsService.getPaymentByBooking(
        req.params.bookingId,
        req.user!.userId,
        req.user!.role
      );
      if (!payment) return sendError(res, 'Payment not found', 404, 'NOT_FOUND');
      return sendSuccess(res, payment);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string | undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await PaymentsService.handleRazorpayWebhook(rawBody, signature, req.body);
      return sendSuccess(res, result, 'Webhook processed');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code || 'WEBHOOK_ERROR');
    }
  }
}
