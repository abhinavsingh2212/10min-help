import { Router } from 'express';
import { VehiclesController } from './vehicles.controller';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from '@10min-help/shared';

const router = Router();

router.use(authMiddleware);

router.post('/', validateBody(createVehicleSchema), VehiclesController.create);
router.get('/', VehiclesController.list);
router.get('/:id', VehiclesController.getById);
router.patch('/:id', validateBody(updateVehicleSchema), VehiclesController.update);
router.delete('/:id', VehiclesController.remove);

export const vehicleRoutes = router;
