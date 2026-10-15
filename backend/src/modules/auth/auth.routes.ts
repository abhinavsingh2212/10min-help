import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { sendOtpSchema, verifyOtpSchema } from '@10min-help/shared';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.post('/send-otp', validateBody(sendOtpSchema), AuthController.sendOtp);
router.post('/verify-otp', validateBody(verifyOtpSchema), AuthController.verifyOtp);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.getMe);

export const authRoutes = router;
