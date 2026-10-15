import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { verifyAccessToken, TokenPayload } from '../utils/crypto';
import { logger } from '../config/logger';
import { ENV } from '../config/env';
import { UserRole } from '@10min-help/shared';
import { TechnicianModel } from '../models/Technician';
import { BookingModel } from '../models/Booking';
import { UserModel } from '../models/User';

let io: SocketIOServer | null = null;

export function initializeSockets(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins =
    ENV.NODE_ENV === 'production'
      ? [ENV.CUSTOMER_WEB_URL, ENV.ADMIN_WEB_URL].filter(Boolean)
      : true;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication token required for Socket connection'));
      }

      const payload = verifyAccessToken(token);

      // Verify user account exists, is active, and session is not revoked
      const user = await UserModel.findById(payload.userId).select('isActive tokenVersion role').lean();
      if (!user) {
        return next(new Error('User account not found'));
      }
      if (!user.isActive) {
        return next(new Error('User account has been suspended or deactivated'));
      }
      if (
        payload.tokenVersion !== undefined &&
        user.tokenVersion !== undefined &&
        payload.tokenVersion !== user.tokenVersion
      ) {
        return next(new Error('Socket session revoked'));
      }

      socket.data.user = {
        ...payload,
        role: user.role || payload.role,
      };

      // If technician, attach technician ID
      if (socket.data.user.role === UserRole.TECHNICIAN) {
        const tech = await TechnicianModel.findOne({ user: payload.userId });
        if (tech) {
          socket.data.technicianId = tech._id.toString();
        }
      }

      next();
    } catch (err: any) {
      logger.warn(`[Sockets] Authentication error: ${err.message}`);
      next(new Error('Invalid socket authentication credentials'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: TokenPayload = socket.data.user;
    logger.info(
      `[Sockets] Client connected: socketId=${socket.id}, user=${user?.userId}, role=${user?.role}`
    );

    // Join personal user room
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    // Join technician room if applicable
    if (socket.data.technicianId) {
      socket.join(`technician:${socket.data.technicianId}`);
      logger.info(`[Sockets] Technician joined room technician:${socket.data.technicianId}`);
    }

    // Join admin room if admin or dispatcher
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.DISPATCHER) {
      socket.join('admin:dispatch');
      logger.info(`[Sockets] Admin joined admin:dispatch room`);
    }

    // Handle joining specific booking room with strict object-level authorization
    socket.on(
      'join:booking',
      async (
        payload: { bookingId?: string } | undefined,
        callback?: (response: { success: boolean; error?: string; room?: string }) => void
      ) => {
        try {
          const bookingId = payload?.bookingId;
          if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
            socket.emit('socket:error', {
              code: 'INVALID_BOOKING_ID',
              message: 'Valid bookingId is required to join booking room.',
            });
            if (typeof callback === 'function') {
              callback({ success: false, error: 'INVALID_BOOKING_ID' });
            }
            return;
          }

          const booking = await BookingModel.findById(bookingId).select('customer technician');
          if (!booking) {
            socket.emit('socket:error', {
              code: 'NOT_FOUND',
              message: 'Booking not found.',
            });
            if (typeof callback === 'function') {
              callback({ success: false, error: 'NOT_FOUND' });
            }
            return;
          }

          const isCustomer = booking.customer.toString() === user?.userId;
          const isAssignedTech = Boolean(
            booking.technician &&
              socket.data.technicianId &&
              booking.technician.toString() === socket.data.technicianId
          );
          const isAdmin =
            user?.role === UserRole.ADMIN || user?.role === UserRole.DISPATCHER;

          if (!isCustomer && !isAssignedTech && !isAdmin) {
            logger.warn(
              `[Sockets] Unauthorized join:booking blocked: user=${user?.userId} booking=${bookingId}`
            );
            socket.emit('socket:error', {
              code: 'FORBIDDEN',
              message: 'You are not authorized to subscribe to this booking room.',
            });
            if (typeof callback === 'function') {
              callback({ success: false, error: 'FORBIDDEN' });
            }
            return;
          }

          await socket.join(`booking:${bookingId}`);
          logger.info(`[Sockets] Socket ${socket.id} joined authorized room booking:${bookingId}`);
          if (typeof callback === 'function') {
            callback({ success: true, room: `booking:${bookingId}` });
          }
        } catch (err: any) {
          logger.error(`[Sockets] Error in join:booking: ${err.message}`);
          if (typeof callback === 'function') {
            callback({ success: false, error: 'INTERNAL_ERROR' });
          }
        }
      }
    );

    socket.on('leave:booking', ({ bookingId }: { bookingId?: string } = {}) => {
      if (bookingId) {
        socket.leave(`booking:${bookingId}`);
      }
    });

    // Real-time location stream from authenticated technician
    socket.on(
      'technician:location',
      async (
        payload: { latitude?: number; longitude?: number; heading?: number; address?: string } | undefined,
        callback?: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          if (user?.role !== UserRole.TECHNICIAN || !socket.data.technicianId) {
            socket.emit('socket:error', {
              code: 'FORBIDDEN',
              message: 'Only technicians may broadcast location telemetry.',
            });
            if (typeof callback === 'function') callback({ success: false, error: 'FORBIDDEN' });
            return;
          }

          if (
            typeof payload?.latitude !== 'number' ||
            typeof payload?.longitude !== 'number' ||
            payload.latitude < -90 ||
            payload.latitude > 90 ||
            payload.longitude < -180 ||
            payload.longitude > 180
          ) {
            socket.emit('socket:error', {
              code: 'INVALID_COORDINATES',
              message: 'Valid numeric latitude and longitude coordinates are required.',
            });
            if (typeof callback === 'function') callback({ success: false, error: 'INVALID_COORDINATES' });
            return;
          }

          const { TrackingService } = await import('../modules/tracking/tracking.service');
          await TrackingService.updateLocation(user.userId, {
            latitude: payload.latitude,
            longitude: payload.longitude,
            heading: payload.heading,
            address: payload.address,
          });

          if (typeof callback === 'function') callback({ success: true });
        } catch (err: any) {
          logger.error(`[Sockets] Error updating technician location via socket: ${err.message}`);
          if (typeof callback === 'function') callback({ success: false, error: err.message });
        }
      }
    );

    socket.on('disconnect', (reason) => {
      logger.info(`[Sockets] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}
