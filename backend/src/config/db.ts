import mongoose from 'mongoose';
import { ENV } from './env';
import { logger } from './logger';

export async function connectDB(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);
    logger.info(`Connecting to MongoDB at ${ENV.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}...`);
    
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('MongoDB successfully connected.');
    return mongoose;
  } catch (error: any) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    // In development or test, we report failure and allow calling code to handle
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected.');
}
