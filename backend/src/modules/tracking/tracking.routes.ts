import { Router } from 'express';
import { TrackingController } from './tracking.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateBody } from '../../middleware/validate';
import { technicianLocationSchema, UserRole } from '@10min-help/shared';

const router = Router();

router.use(authMiddleware);

router.post(
  '/location',
  requireRole(UserRole.TECHNICIAN),
  validateBody(technicianLocationSchema),
  TrackingController.updateLocation
);
router.get('/bookings/:bookingId', TrackingController.getBookingTracking);

export const trackingRoutes = router;
