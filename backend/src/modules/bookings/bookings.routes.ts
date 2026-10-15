import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  createBookingSchema,
  cancelBookingSchema,
  quoteApprovalSchema,
  technicianQuoteRevisionSchema,
  technicianJobStatusSchema,
  UserRole,
} from '@10min-help/shared';
import { requireRole } from '../../middleware/role';

const router = Router();

router.use(authMiddleware);

router.post('/', validateBody(createBookingSchema), BookingsController.create);
router.get('/', BookingsController.listMyBookings);
router.get('/:id', BookingsController.getById);
router.post('/:id/cancel', validateBody(cancelBookingSchema), BookingsController.cancel);
router.post('/:id/retry-dispatch', BookingsController.retryDispatch);
router.post(
  '/:id/propose-quote',
  requireRole(UserRole.TECHNICIAN),
  validateBody(technicianQuoteRevisionSchema),
  BookingsController.proposeQuote
);
router.post(
  '/:id/respond-quote',
  requireRole(UserRole.CUSTOMER),
  validateBody(quoteApprovalSchema),
  BookingsController.respondQuote
);
router.post(
  '/:id/approve-quote',
  requireRole(UserRole.CUSTOMER),
  validateBody(quoteApprovalSchema),
  BookingsController.respondQuote
);
router.post(
  '/:id/status',
  requireRole(UserRole.TECHNICIAN),
  validateBody(technicianJobStatusSchema),
  BookingsController.updateStatus
);

export const bookingRoutes = router;
