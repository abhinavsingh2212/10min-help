import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRoutes } from './modules/auth/auth.routes';
import { vehicleRoutes } from './modules/vehicles/vehicles.routes';
import { serviceRoutes } from './modules/services/services.routes';
import { technicianRoutes } from './modules/technicians/technicians.routes';
import { bookingRoutes } from './modules/bookings/bookings.routes';
import { dispatchRoutes } from './modules/dispatch/dispatch.routes';
import { trackingRoutes } from './modules/tracking/tracking.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { reviewRoutes } from './modules/reviews/reviews.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';

export function createApp(): Application {
  const app = express();

  // Security and utilities middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health checks
  app.get('/health', (_req: Request, res: Response) => {
    return sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    return sendSuccess(res, { status: 'healthy', version: 'v1', timestamp: new Date().toISOString() });
  });

  // REST API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/vehicles', vehicleRoutes);
  app.use('/api/v1/services', serviceRoutes);
  app.use('/api/v1/technicians', technicianRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/dispatch', dispatchRoutes);
  app.use('/api/v1/tracking', trackingRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Catch unhandled 404s
  app.use((req: Request, res: Response) => {
    return res.status(404).json({
      success: false,
      error: {
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        code: 'NOT_FOUND',
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
