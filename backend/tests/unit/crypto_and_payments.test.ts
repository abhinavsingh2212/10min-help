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
  });
});
