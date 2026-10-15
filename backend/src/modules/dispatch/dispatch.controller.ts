import { Request, Response, NextFunction } from 'express';
import { DispatchService } from './dispatch.service';
import { sendSuccess, sendError } from '../../utils/response';

export class DispatchController {
  static async getPendingOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const offer = await DispatchService.getPendingOfferForTechnician(req.user!.userId);
      return sendSuccess(res, offer);
    } catch (err) {
      next(err);
    }
  }

  static async acceptOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { offerId } = req.params;
      const booking = await DispatchService.acceptOffer(offerId, req.user!.userId);
      return sendSuccess(res, booking, 'Booking accepted successfully');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
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
