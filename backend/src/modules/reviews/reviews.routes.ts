import { Router } from 'express';
import { ReviewsController } from './reviews.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createReviewSchema } from '@10min-help/shared';

const router = Router();

router.post('/', authMiddleware, validateBody(createReviewSchema), ReviewsController.create);
router.get('/bookings/:bookingId', optionalAuthMiddleware, ReviewsController.getBookingReview);
router.get('/technicians/:technicianId', optionalAuthMiddleware, ReviewsController.getTechnicianReviews);

export const reviewRoutes = router;
