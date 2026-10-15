import { Router } from 'express';
import { ServicesController } from './services.controller';

const router = Router();

router.get('/', ServicesController.list);
router.get('/quote', ServicesController.quote);
router.get('/:id', ServicesController.getById);

export const serviceRoutes = router;
