import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/crypto';
import { logger } from '../config/logger';
import { ENV } from '../config/env';
import { UserRole } from '@10min-help/shared';
import { TechnicianModel } from '../models/Technician';

let io: SocketIOServer | null = null;

export function initializeSockets(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow web and mobile clients
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        // Allow unauthenticated connections if in development, but tag as guest
        if (ENV.NODE_ENV !== 'production') {
          socket.data.user = { userId: 'anonymous', role: UserRole.CUSTOMER };
          return next();
        }
        return next(new Error('Authentication token required for Socket connection'));
      }

      const payload = verifyAccessToken(token);
      socket.data.user = payload;

      // If technician, attach technician ID
      if (payload.role === UserRole.TECHNICIAN) {
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
    logger.info(`[Sockets] Client connected: socketId=${socket.id}, user=${user?.userId}, role=${user?.role}`);

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

    // Handle joining specific booking room
    socket.on('join:booking', ({ bookingId }: { bookingId: string }) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
        logger.info(`[Sockets] Socket ${socket.id} joined room booking:${bookingId}`);
      }
    });

    socket.on('leave:booking', ({ bookingId }: { bookingId: string }) => {
      if (bookingId) {
        socket.leave(`booking:${bookingId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Sockets] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}
