import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateBody } from '../../middleware/validate';
import {
  adminAssignBookingSchema,
  adminTechnicianStatusSchema,
  UserRole,
} from '@10min-help/shared';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN, UserRole.DISPATCHER));

router.get('/metrics', AdminController.getMetrics);
router.get('/kpis', AdminController.getMetrics);
router.get('/live-map', AdminController.getLiveMap);
router.get('/radar', AdminController.getLiveMap);
router.get('/bookings', AdminController.listBookings);
router.post('/bookings/:bookingId/assign', validateBody(adminAssignBookingSchema), AdminController.manualAssign);
router.get('/technicians', AdminController.listTechnicians);
router.patch(
  '/technicians/:id/verification',
  validateBody(adminTechnicianStatusSchema),
  AdminController.updateTechnicianVerification
);
router.patch('/services/:id', AdminController.updateServicePricing);
router.get('/audit-logs', AdminController.getAuditLogs);

export const adminRoutes = router;
