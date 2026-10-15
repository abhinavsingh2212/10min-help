import { Request, Response, NextFunction } from 'express';
import { ReviewsService } from './reviews.service';
import { sendSuccess, sendError } from '../../utils/response';

export class ReviewsController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId, rating, comment } = req.body;
      const review = await ReviewsService.createReview(req.user!.userId, bookingId, rating, comment);
      return sendSuccess(res, review, 'Thank you for your rating!', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getBookingReview(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await ReviewsService.getBookingReview(req.params.bookingId);
      return sendSuccess(res, review);
    } catch (err) {
      next(err);
    }
  }

  static async getTechnicianReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await ReviewsService.getReviewsByTechnician(req.params.technicianId);
      return sendSuccess(res, reviews);
    } catch (err) {
      next(err);
    }
  }
}
