import { UserModel, IUser } from '../../models/User';
import { TechnicianModel } from '../../models/Technician';
import { NotificationModel } from '../../models/Notification';
import {
  UserRole,
  TechnicianVerificationStatus,
  ServiceCategory,
  VehicleType,
  normalizePhoneNumber,
} from '@10min-help/shared';
import { ENV } from '../../config/env';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateSecureOtp,
  TokenPayload,
} from '../../utils/crypto';
import { logger } from '../../config/logger';

interface OtpRecord {
  otp: string;
  expiresAt: number;
  role?: UserRole;
  attempts: number;
  sendCount: number;
  windowStartedAt: number;
}

const MAX_OTP_SEND_PER_WINDOW = 10;
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_VERIFY_ATTEMPTS = 5;

const otpStore = new Map<string, OtpRecord>();

export class AuthService {
  static resetOtpStoreForTests() {
    otpStore.clear();
  }

  static async sendOtp(
    phone: string,
    role: UserRole = UserRole.CUSTOMER
  ): Promise<{ message: string; devOtp?: string }> {
    const cleanPhone = normalizePhoneNumber(phone);

    // Prevent public callers from requesting an OTP to create a new ADMIN/DISPATCHER account
    if (role === UserRole.ADMIN || role === UserRole.DISPATCHER) {
      const existingPrivileged = await UserModel.findOne({ phone: cleanPhone });
      if (
        !existingPrivileged ||
        (existingPrivileged.role !== UserRole.ADMIN && existingPrivileged.role !== UserRole.DISPATCHER)
      ) {
        const err: any = new Error('Access denied: administrative or dispatcher accounts must be provisioned by an administrator.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN_ROLE';
        throw err;
      }
    }

    const now = Date.now();
    const existingRecord = otpStore.get(cleanPhone);
    let sendCount = 1;
    let windowStartedAt = now;

    if (existingRecord && now - existingRecord.windowStartedAt < OTP_SEND_WINDOW_MS) {
      if (existingRecord.sendCount >= MAX_OTP_SEND_PER_WINDOW) {
        const err: any = new Error('Too many OTP requests for this phone number. Please wait before requesting another code.');
        err.statusCode = 429;
        err.code = 'RATE_LIMITED';
        throw err;
      }
      sendCount = existingRecord.sendCount + 1;
      windowStartedAt = existingRecord.windowStartedAt;
    }

    const isMockMode = ENV.NODE_ENV !== 'production' && ENV.OTP_PROVIDER === 'mock';
    const otp = isMockMode ? ENV.DEV_OTP_CODE : generateSecureOtp();

    const expiresAt = now + 5 * 60 * 1000; // 5 minutes
    otpStore.set(cleanPhone, {
      otp,
      expiresAt,
      role,
      attempts: 0,
      sendCount,
      windowStartedAt,
    });

    const maskedPhone = cleanPhone.length >= 4 ? `******${cleanPhone.slice(-4)}` : '****';
    logger.info(`[Auth] Dispatched verification OTP to ${maskedPhone} (expires in 5m)`);

    return {
      message: `OTP sent successfully to ${cleanPhone}.`,
      devOtp: isMockMode ? otp : undefined,
    };
  }

  static async verifyOtp(
    phone: string,
    otp: string,
    name?: string,
    requestedRole?: UserRole
  ): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    const cleanPhone = normalizePhoneNumber(phone);
    const record = otpStore.get(cleanPhone);

    if (!record) {
      const err: any = new Error('No active OTP request found for this phone number. Please request a verification code first.');
      err.statusCode = 400;
      err.code = 'NO_OTP_REQUEST';
      throw err;
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      const err: any = new Error('OTP has expired. Please request a new verification code.');
      err.statusCode = 400;
      err.code = 'OTP_EXPIRED';
      throw err;
    }

    const isMockMode = ENV.NODE_ENV !== 'production' && ENV.OTP_PROVIDER === 'mock';
    const isMatch = (isMockMode && otp === ENV.DEV_OTP_CODE) || record.otp === otp;

    if (!isMatch) {
      record.attempts += 1;
      if (record.attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
        otpStore.delete(cleanPhone);
        const err: any = new Error('Maximum OTP verification attempts exceeded. Please request a new code.');
        err.statusCode = 429;
        err.code = 'MAX_ATTEMPTS_EXCEEDED';
        throw err;
      }
      const remaining = MAX_OTP_VERIFY_ATTEMPTS - record.attempts;
      const err: any = new Error(`Invalid verification code. ${remaining} attempt(s) remaining.`);
      err.statusCode = 400;
      err.code = 'AUTH_FAILED';
      throw err;
    }

    const effectiveRequestedRole = requestedRole || record.role || UserRole.CUSTOMER;
    otpStore.delete(cleanPhone);

    let user = await UserModel.findOne({ phone: cleanPhone });

    if (!user) {
      // Block public privilege escalation to ADMIN or DISPATCHER
      if (effectiveRequestedRole === UserRole.ADMIN || effectiveRequestedRole === UserRole.DISPATCHER) {
        const err: any = new Error('Cannot self-register an administrative or dispatcher account.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN_ROLE_ESCALATION';
        throw err;
      }

      const newRole =
        effectiveRequestedRole === UserRole.TECHNICIAN ? UserRole.TECHNICIAN : UserRole.CUSTOMER;

      user = await UserModel.create({
        phone: cleanPhone,
        name: name?.trim() || (newRole === UserRole.TECHNICIAN ? 'Technician Partner' : 'Help Customer'),
        role: newRole,
        isActive: true,
        lastLoginAt: new Date(),
        tokenVersion: 0,
      });

      // New technicians start as PENDING verification and offline until vetted by an administrator
      if (newRole === UserRole.TECHNICIAN) {
        await TechnicianModel.create({
          user: user._id,
          verificationStatus: TechnicianVerificationStatus.PENDING,
          skills: [ServiceCategory.PUNCTURE, ServiceCategory.BATTERY, ServiceCategory.NOT_STARTING],
          supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
          serviceAreas: ['Bangalore Central'],
          isOnline: false,
        });
      }
    } else {
      if (!user.isActive) {
        const err: any = new Error('Your account has been suspended or deactivated. Please contact support.');
        err.statusCode = 403;
        err.code = 'ACCOUNT_DEACTIVATED';
        throw err;
      }

      // Prevent role escalation: if caller explicitly requested ADMIN/DISPATCHER on a non-admin account, reject
      if (
        (requestedRole === UserRole.ADMIN || requestedRole === UserRole.DISPATCHER) &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.DISPATCHER
      ) {
        const err: any = new Error('Access denied: your account does not have administrative privileges.');
        err.statusCode = 403;
        err.code = 'FORBIDDEN_ROLE_ESCALATION';
        throw err;
      }

      user.lastLoginAt = new Date();
      if (name?.trim()) {
        user.name = name.trim();
      }
    }

    const payload: TokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    const sanitizedUser = await UserModel.findById(user._id);

    return {
      user: sanitizedUser || user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
      },
    };
  }

  static async refreshTokens(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      const err: any = new Error('Invalid or expired refresh token');
      err.statusCode = 401;
      throw err;
    }

    const user = await UserModel.findById(payload.userId).select('+refreshTokenHash');
    if (!user || !user.isActive) {
      const err: any = new Error('User not found or account deactivated');
      err.statusCode = 401;
      throw err;
    }

    const incomingHash = hashToken(refreshToken);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
      // Possible token replay detected: invalidate active refresh token
      user.refreshTokenHash = undefined;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      const err: any = new Error('Refresh token has been revoked or already rotated');
      err.statusCode = 401;
      throw err;
    }

    const newPayload: TokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  static async logout(userId: string): Promise<{ loggedOut: boolean }> {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1 },
      $inc: { tokenVersion: 1 },
    });
    return { loggedOut: true };
  }

  static async getMe(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    if (!user.isActive) {
      const err: any = new Error('Account is deactivated');
      err.statusCode = 403;
      throw err;
    }

    let technicianProfile = null;
    if (user.role === UserRole.TECHNICIAN) {
      technicianProfile = await TechnicianModel.findOne({ user: user._id });
    }

    return { user, technicianProfile };
  }

  static async updateProfile(
    userId: string,
    updates: {
      name?: string;
      email?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
    }
  ) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    if (updates.name !== undefined && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.email !== undefined) {
      user.email = updates.email.trim() || undefined;
    }
    if (updates.emergencyContactName !== undefined) {
      user.emergencyContactName = updates.emergencyContactName.trim() || undefined;
    }
    if (updates.emergencyContactPhone !== undefined) {
      user.emergencyContactPhone = updates.emergencyContactPhone.trim()
        ? normalizePhoneNumber(updates.emergencyContactPhone)
        : undefined;
    }

    await user.save();
    return user;
  }

  static async getNotifications(userId: string) {
    return NotificationModel.find({ recipient: userId }).sort({ createdAt: -1 }).limit(50);
  }

  static async markNotificationRead(userId: string, notificationId: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
  }
}
