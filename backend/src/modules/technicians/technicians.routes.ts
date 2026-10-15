import { Router } from 'express';
import { TechniciansController } from './technicians.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validateBody } from '../../middleware/validate';
import {
  technicianApplicationSchema,
  technicianAvailabilitySchema,
  technicianLocationSchema,
  UserRole,
} from '@10min-help/shared';

const router = Router();

router.use(authMiddleware);

router.post('/applications', validateBody(technicianApplicationSchema), TechniciansController.apply);
router.get('/me', requireRole(UserRole.TECHNICIAN, UserRole.ADMIN), TechniciansController.getMe);
router.patch(
  '/availability',
  requireRole(UserRole.TECHNICIAN),
  validateBody(technicianAvailabilitySchema),
  TechniciansController.setAvailability
);
router.post(
  '/location',
  requireRole(UserRole.TECHNICIAN),
  validateBody(technicianLocationSchema),
  TechniciansController.updateLocation
);
router.get('/active-job', requireRole(UserRole.TECHNICIAN), TechniciansController.getActiveJob);
router.get('/earnings', requireRole(UserRole.TECHNICIAN), TechniciansController.getEarnings);

export const technicianRoutes = router;
