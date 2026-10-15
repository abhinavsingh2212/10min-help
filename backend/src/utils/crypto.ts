import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserRole } from '@10min-help/shared';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  phone: string;
  tokenVersion?: number;
  jti?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  const { userId, role, phone, tokenVersion } = payload;
  return jwt.sign({ userId, role, phone, tokenVersion }, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  const { userId, role, phone, tokenVersion } = payload;
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ userId, role, phone, tokenVersion, jti }, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as TokenPayload;
}

/**
 * Verifies Razorpay/Gateway HMAC-SHA256 signature using constant-time comparison
 */
export function verifyHmacSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = ENV.PAYMENT_KEY_SECRET
): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  if (
    ENV.NODE_ENV !== 'production' &&
    ENV.PAYMENT_PROVIDER === 'mock' &&
    secret === ENV.PAYMENT_KEY_SECRET
  ) {
    if (signature.startsWith('mock_sig_') || signature === 'valid_mock_signature') {
      return true;
    }
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies Razorpay webhook signature against raw payload body
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string = ENV.PAYMENT_WEBHOOK_SECRET
): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
