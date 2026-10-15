import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or backend
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to local cwd

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5001', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/10min_help',
  
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '10min_help_super_secure_access_secret_2026_dev_key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '10min_help_super_secure_refresh_secret_2026_dev_key',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  CUSTOMER_WEB_URL: process.env.CUSTOMER_WEB_URL || 'http://localhost:3000',
  ADMIN_WEB_URL: process.env.ADMIN_WEB_URL || 'http://localhost:3001',

  MAPS_PROVIDER: process.env.MAPS_PROVIDER || 'mock',
  MAPS_API_KEY: process.env.MAPS_API_KEY || 'mock_maps_api_key',

  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
  PAYMENT_KEY_ID: process.env.PAYMENT_KEY_ID || 'rzp_test_sampleKeyId12345',
  PAYMENT_KEY_SECRET: process.env.PAYMENT_KEY_SECRET || 'sampleSecretValueDoNotUseInProd',
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'sampleWebhookSecretForSignatures',

  OTP_PROVIDER: process.env.OTP_PROVIDER || 'mock',
  DEV_OTP_CODE: '123456',

  DISPATCH_SEARCH_RADIUS_KM: parseFloat(process.env.DISPATCH_SEARCH_RADIUS_KM || '10'),
  DISPATCH_OFFER_TIMEOUT_SECONDS: parseInt(process.env.DISPATCH_OFFER_TIMEOUT_SECONDS || '15', 10),
  DISPATCH_MAX_RETRY_ROUNDS: parseInt(process.env.DISPATCH_MAX_RETRY_ROUNDS || '3', 10),
};
