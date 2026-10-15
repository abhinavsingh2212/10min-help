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
      return sendError(res, err.message, 400);
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
      return sendError(res, err.message, 400);
    }
  }

  static async recordCash(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.body;
      const payment = await PaymentsService.recordCashPayment(bookingId, req.user!.userId);
      return sendSuccess(res, payment, 'Cash payment recorded');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getByBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentsService.getPaymentByBooking(req.params.bookingId);
      if (!payment) return sendError(res, 'Payment not found', 404);
      return sendSuccess(res, payment);
    } catch (err) {
      next(err);
    }
  }
}
