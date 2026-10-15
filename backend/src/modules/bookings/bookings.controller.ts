import { Request, Response, NextFunction } from 'express';
import { BookingsService } from './bookings.service';
import { sendSuccess, sendError } from '../../utils/response';

export class BookingsController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await BookingsService.createBooking(req.user!.userId, req.body);
      return sendSuccess(res, booking, 'Booking created and dispatch initiated', 201);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await BookingsService.getBookingById(req.params.id, req.user!.userId, req.user!.role);
      return sendSuccess(res, booking);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 404, err.code);
    }
  }

  static async listMyBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await BookingsService.listCustomerBookings(req.user!.userId);
      return sendSuccess(res, bookings);
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const booking = await BookingsService.cancelBooking(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        reason
      );
      return sendSuccess(res, booking, 'Booking cancelled');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async retryDispatch(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await BookingsService.retryDispatch(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      return sendSuccess(res, booking, 'Dispatch search re-initiated');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async proposeQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { revisedAmount, reason } = req.body;
      const booking = await BookingsService.proposeQuoteRevision(
        req.params.id,
        req.user!.userId,
        revisedAmount,
        reason
      );
      return sendSuccess(res, booking, 'Revised quotation proposed for customer approval');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async respondQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { approved, notes } = req.body;
      const booking = await BookingsService.respondToQuoteRevision(
        req.params.id,
        req.user!.userId,
        approved,
        notes
      );
      return sendSuccess(res, booking, approved ? 'Quote approved' : 'Quote rejected');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, notes } = req.body;
      const booking = await BookingsService.updateJobStatus(
        req.params.id,
        req.user!.userId,
        status,
        notes
      );
      return sendSuccess(res, booking, `Booking status updated to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await BookingsService.getInvoice(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );

      if (req.query.format === 'html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(invoice.htmlReceipt);
      }

      return sendSuccess(res, invoice);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }
}
