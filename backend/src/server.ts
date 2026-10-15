import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { initializeSockets } from './sockets';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs';
import { ENV, validateEnv } from './config/env';
import { logger } from './config/logger';

async function startServer() {
  try {
    // Validate production environment security configuration
    validateEnv();

    const app = createApp();
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    initializeSockets(httpServer);

    // Connect to database
    await connectDB();

    // Start background jobs (offer timeouts)
    startBackgroundJobs();

    const PORT = ENV.PORT;
    httpServer.listen(PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  10Min Help Backend Server running on port ${PORT}`);
      logger.info(`  Environment: ${ENV.NODE_ENV}`);
      logger.info(`  Health Check: http://localhost:${PORT}/api/v1/health`);
      logger.info(`=======================================================`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      stopBackgroundJobs();
      httpServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { startServer };
