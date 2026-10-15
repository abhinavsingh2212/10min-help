import { Request, Response, NextFunction } from 'express';
import { DispatchService } from './dispatch.service';
import { sendSuccess, sendError } from '../../utils/response';

export class DispatchController {
  static async acceptOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { offerId } = req.params;
      const booking = await DispatchService.acceptOffer(offerId, req.user!.userId);
      return sendSuccess(res, booking, 'Booking accepted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async rejectOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { offerId } = req.params;
      const { reason } = req.body;
      const success = await DispatchService.rejectOffer(offerId, req.user!.userId, reason);
      return sendSuccess(res, { rejected: success }, 'Offer rejected');
    } catch (err) {
      next(err);
    }
  }
}
