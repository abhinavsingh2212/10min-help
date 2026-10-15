import { Request, Response, NextFunction } from 'express';
import { TrackingService } from './tracking.service';
import { sendSuccess, sendError } from '../../utils/response';

export class TrackingController {
  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TrackingService.updateLocation(req.user!.userId, req.body);
      return sendSuccess(res, result, 'Location tracked');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400, err.code);
    }
  }

  static async getBookingTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const tracking = await TrackingService.getBookingTracking(
        req.params.bookingId,
        req.user!.userId,
        req.user!.role
      );
      return sendSuccess(res, tracking);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 404, err.code);
    }
  }
}
