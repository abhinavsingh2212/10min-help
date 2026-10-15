import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserRole } from '@10min-help/shared';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  phone: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as TokenPayload;
}

/**
 * Verifies Razorpay/Gateway HMAC-SHA256 signature
 */
export function verifyHmacSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = ENV.PAYMENT_KEY_SECRET
): boolean {
  if (ENV.PAYMENT_PROVIDER === 'mock') {
    // In mock mode, allow dev test signatures or verify mock signature
    if (signature.startsWith('mock_sig_') || signature === 'valid_mock_signature') return true;
  }
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}
