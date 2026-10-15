import {
  generateAccessToken,
  verifyAccessToken,
  verifyHmacSignature,
  TokenPayload,
} from '../../src/utils/crypto';
import { UserRole } from '@10min-help/shared';
import crypto from 'crypto';

describe('Security & Payment HMAC Verification Unit Tests', () => {
  const samplePayload: TokenPayload = {
    userId: 'user_64f1234567890abcdef12345',
    role: UserRole.CUSTOMER,
    phone: '9876543210',
  };

  it('should generate and verify valid JWT access tokens', () => {
    const token = generateAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(samplePayload.userId);
    expect(decoded.role).toBe(samplePayload.role);
    expect(decoded.phone).toBe(samplePayload.phone);
  });

  it('should verify genuine HMAC payment signatures and reject forged ones', () => {
    const orderId = 'order_123456789';
    const paymentId = 'pay_987654321';
    const secret = 'super_secret_test_key';

    // Generate valid HMAC
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Valid check
    const isValid = verifyHmacSignature(orderId, paymentId, validSignature, secret);
    expect(isValid).toBe(true);

    // Tampered check
    const isTampered = verifyHmacSignature(orderId, paymentId, 'tampered_signature_xyz', secret);
    expect(isTampered).toBe(false);

    // Tampered payment ID check
    const isWrongPaymentId = verifyHmacSignature(orderId, 'pay_forged_id', validSignature, secret);
    expect(isWrongPaymentId).toBe(false);

    // Tampered order ID check
    const isWrongOrderId = verifyHmacSignature('order_forged_id', paymentId, validSignature, secret);
    expect(isWrongOrderId).toBe(false);

    // Missing fields check
    expect(verifyHmacSignature('', paymentId, validSignature, secret)).toBe(false);
    expect(verifyHmacSignature(orderId, '', validSignature, secret)).toBe(false);
    expect(verifyHmacSignature(orderId, paymentId, '', secret)).toBe(false);
  });

  it('should verify webhook raw payload signature and reject tampered bodies', () => {
    const secret = 'webhook_secret_key_12345';
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_1', amount: 34900, order_id: 'order_test_1' } } },
    });

    const validWebhookSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    // Verification check
    const { verifyWebhookSignature } = require('../../src/utils/crypto');
    expect(verifyWebhookSignature(rawBody, validWebhookSig, secret)).toBe(true);

    // Tampered body with same signature check
    const tamperedBody = rawBody.replace('34900', '10000');
    expect(verifyWebhookSignature(tamperedBody, validWebhookSig, secret)).toBe(false);

    // Empty or missing signature check
    expect(verifyWebhookSignature(rawBody, '', secret)).toBe(false);
    expect(verifyWebhookSignature('', validWebhookSig, secret)).toBe(false);
  });

  it('should enforce production environment validation guards', () => {
    const { validateEnv } = require('../../src/config/env');
    const originalEnv = { ...process.env };

    // In non-production, no error thrown
    expect(() => validateEnv()).not.toThrow();

    // In production with mock providers, must throw fatal error
    const { ENV } = require('../../src/config/env');
    const originalNodeEnv = ENV.NODE_ENV;
    const originalOtpProvider = ENV.OTP_PROVIDER;

    try {
      ENV.NODE_ENV = 'production';
      ENV.OTP_PROVIDER = 'mock';
      expect(() => validateEnv()).toThrow(/Mock OTP provider is strictly prohibited in production/);

      ENV.OTP_PROVIDER = 'fast2sms';
      ENV.PAYMENT_PROVIDER = 'mock';
      expect(() => validateEnv()).toThrow(/Mock payment provider is strictly prohibited in production/);
    } finally {
      ENV.NODE_ENV = originalNodeEnv;
      ENV.OTP_PROVIDER = originalOtpProvider;
      Object.assign(process.env, originalEnv);
    }
  });
});
