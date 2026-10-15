import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  UserRole,
} from '@10min-help/shared';
import { requireRole } from '../../middleware/role';

const router = Router();

router.use(authMiddleware);

router.post('/orders', validateBody(createPaymentOrderSchema), PaymentsController.createOrder);
router.post('/verify', validateBody(verifyPaymentSchema), PaymentsController.verify);
router.post(
  '/cash',
  requireRole(UserRole.TECHNICIAN),
  PaymentsController.recordCash
);
router.get('/bookings/:bookingId', PaymentsController.getByBooking);

export const paymentRoutes = router;
