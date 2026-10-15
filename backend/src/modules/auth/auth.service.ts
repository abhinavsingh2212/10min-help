import { UserModel, IUser } from '../../models/User';
import { TechnicianModel } from '../../models/Technician';
import { UserRole, TechnicianVerificationStatus, ServiceCategory, VehicleType } from '@10min-help/shared';
import { ENV } from '../../config/env';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../../utils/crypto';
import { logger } from '../../config/logger';

// In-memory OTP storage for demonstration/development
const otpStore = new Map<string, { otp: string; expiresAt: number; role?: UserRole }>();

export class AuthService {
  static async sendOtp(phone: string, role: UserRole = UserRole.CUSTOMER): Promise<{ message: string; devOtp?: string }> {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');

    // Generate 6-digit OTP
    const otp = ENV.NODE_ENV === 'production' && ENV.OTP_PROVIDER !== 'mock'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : ENV.DEV_OTP_CODE;

    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(cleanPhone, { otp, expiresAt, role });

    logger.info(`[Auth] OTP for ${cleanPhone} is: ${otp} (expires in 5m)`);

    return {
      message: `OTP sent successfully to ${cleanPhone}.`,
      devOtp: ENV.NODE_ENV !== 'production' || ENV.OTP_PROVIDER === 'mock' ? otp : undefined,
    };
  }

  static async verifyOtp(
    phone: string,
    otp: string,
    name?: string,
    requestedRole?: UserRole
  ): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const record = otpStore.get(cleanPhone);

    // Validate OTP (accepts either the stored OTP or the dev test OTP)
    const isValidDevOtp = (ENV.NODE_ENV !== 'production' || ENV.OTP_PROVIDER === 'mock') && otp === ENV.DEV_OTP_CODE;
    const isStoredOtpMatch = record && record.otp === otp && record.expiresAt > Date.now();

    if (!isValidDevOtp && !isStoredOtpMatch) {
      throw new Error('Invalid or expired OTP. Please request a new code.');
    }

    // Clear used OTP
    otpStore.delete(cleanPhone);

    const role = requestedRole || record?.role || UserRole.CUSTOMER;

    // Find or create user for ANY phone number
    let user = await UserModel.findOne({ phone: cleanPhone });
    if (!user) {
      user = await UserModel.create({
        phone: cleanPhone,
        name: name?.trim() || (role === UserRole.TECHNICIAN ? 'Technician Partner' : 'Help Customer'),
        role,
        isActive: true,
        lastLoginAt: new Date(),
      });

      // If user is a technician, create initial technician record
      if (role === UserRole.TECHNICIAN) {
        await TechnicianModel.create({
          user: user._id,
          verificationStatus: TechnicianVerificationStatus.VERIFIED,
          skills: [ServiceCategory.PUNCTURE, ServiceCategory.BATTERY, ServiceCategory.NOT_STARTING],
          supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
          serviceAreas: ['Bangalore Central', 'Indiranagar', 'Koramangala'],
          isOnline: true,
        });
      }
    } else {
      user.lastLoginAt = new Date();
      if (name?.trim()) {
        user.name = name.trim();
      }
      await user.save();
    }

    const payload: TokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 mins
      },
    };
  }

  static async refreshTokens(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await UserModel.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or account deactivated');
      }

      const newPayload: TokenPayload = {
        userId: user._id.toString(),
        role: user.role,
        phone: user.phone,
      };

      const accessToken = generateAccessToken(newPayload);
      const newRefreshToken = generateRefreshToken(newPayload);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60,
      };
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async getMe(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    let technicianProfile = null;
    if (user.role === UserRole.TECHNICIAN) {
      technicianProfile = await TechnicianModel.findOne({ user: user._id });
    }

    return { user, technicianProfile };
  }
}
