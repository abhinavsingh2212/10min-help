import { Router } from 'express';
import { DispatchController } from './dispatch.controller';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { UserRole } from '@10min-help/shared';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.TECHNICIAN));

router.get('/offers/pending', DispatchController.getPendingOffer);
router.post('/offers/:offerId/accept', DispatchController.acceptOffer);
router.post('/offers/:offerId/reject', DispatchController.rejectOffer);

export const dispatchRoutes = router;
