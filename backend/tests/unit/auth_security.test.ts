import { AuthService } from '../../src/modules/auth/auth.service';
import { generateSecureOtp, hashToken, generateAccessToken } from '../../src/utils/crypto';
import { UserModel } from '../../src/models/User';
import { UserRole } from '@10min-help/shared';
import { authMiddleware } from '../../src/middleware/auth';
import mongoose from 'mongoose';

describe('Auth Security & Hardening Unit Tests', () => {
  beforeEach(() => {
    AuthService.resetOtpStoreForTests();
    jest.restoreAllMocks();
  });

  it('should generate a 6-digit cryptographically secure OTP', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateSecureOtp();
      expect(otp).toHaveLength(6);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    }
  });

  it('should reject verification when no OTP request was initiated', async () => {
    await expect(
      AuthService.verifyOtp('9876543210', '123456', 'Tester', UserRole.CUSTOMER)
    ).rejects.toThrow('No active OTP request found for this phone number');
  });

  it('should reject and delete OTP when maximum attempts (5) are exceeded', async () => {
    const phone = '9876543210';
    await AuthService.sendOtp(phone, UserRole.CUSTOMER);

    // 4 wrong attempts
    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(AuthService.verifyOtp(phone, '000000')).rejects.toThrow(
        /Invalid verification code/
      );
    }

    // 5th wrong attempt triggers rate limit lockout
    await expect(AuthService.verifyOtp(phone, '000000')).rejects.toThrow(
      'Maximum OTP verification attempts exceeded'
    );

    // 6th attempt should confirm OTP was deleted from store
    await expect(AuthService.verifyOtp(phone, '123456')).rejects.toThrow(
      'No active OTP request found for this phone number'
    );
  });

  it('should reject OTP after expiration time', async () => {
    const phone = '9123456780';
    await AuthService.sendOtp(phone, UserRole.CUSTOMER);

    // Mock Date.now to 6 minutes in the future (expiry is 5 minutes)
    const realDateNow = Date.now;
    try {
      Date.now = () => realDateNow() + 6 * 60 * 1000;
      await expect(AuthService.verifyOtp(phone, '123456')).rejects.toThrow(
        'OTP has expired. Please request a new verification code.'
      );
    } finally {
      Date.now = realDateNow;
    }
  });

  it('should block self-registration or promotion to ADMIN or DISPATCHER', async () => {
    const phone = '9999988888';
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);

    // Trying to send OTP requesting ADMIN on unprovisioned phone should fail
    await expect(AuthService.sendOtp(phone, UserRole.ADMIN)).rejects.toThrow(
      /Access denied: administrative or dispatcher accounts must be provisioned/
    );

    await expect(AuthService.sendOtp(phone, UserRole.DISPATCHER)).rejects.toThrow(
      /Access denied: administrative or dispatcher accounts must be provisioned/
    );
  });

  it('should hash refresh tokens with sha256 for secure comparison', () => {
    const token = 'sample_refresh_token_xyz_12345';
    const hashed = hashToken(token);
    expect(typeof hashed).toBe('string');
    expect(hashed).toHaveLength(64); // SHA-256 is 64 hex characters
    expect(hashToken(token)).toBe(hashed); // Idempotent
    expect(hashToken('different_token')).not.toBe(hashed);
  });

  it('should reject requests via authMiddleware when user account is deactivated in DB', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateAccessToken({
      userId,
      role: UserRole.CUSTOMER,
      phone: '9876543210',
      tokenVersion: 0,
    });

    const mockReq: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const mockRes: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockNext = jest.fn();

    // User is deactivated
    jest.spyOn(UserModel, 'findById').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userId, isActive: false, tokenVersion: 0, role: UserRole.CUSTOMER }),
      }),
    } as any);

    await authMiddleware(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ACCOUNT_DEACTIVATED' }),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject requests via authMiddleware when tokenVersion does not match (session revoked)', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateAccessToken({
      userId,
      role: UserRole.CUSTOMER,
      phone: '9876543210',
      tokenVersion: 1, // Stale tokenVersion
    });

    const mockReq: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const mockRes: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockNext = jest.fn();

    // User's tokenVersion was bumped to 2 (revoked)
    jest.spyOn(UserModel, 'findById').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userId, isActive: true, tokenVersion: 2, role: UserRole.CUSTOMER }),
      }),
    } as any);

    await authMiddleware(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'SESSION_REVOKED' }),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
