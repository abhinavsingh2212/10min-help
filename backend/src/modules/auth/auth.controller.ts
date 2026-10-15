import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

export class AuthController {
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, role } = req.body;
      const result = await AuthService.sendOtp(phone, role);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode, err.code);
      }
      next(err);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp, name, role } = req.body;
      const result = await AuthService.verifyOtp(phone, otp, name, role);
      return sendSuccess(res, result, 'Authentication successful');
    } catch (err: any) {
      return sendError(
        res,
        err.message || 'OTP verification failed',
        err.statusCode || 400,
        err.code || 'AUTH_FAILED'
      );
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendError(res, 'Refresh token is required', 400, 'MISSING_TOKEN');
      }
      const tokens = await AuthService.refreshTokens(refreshToken);
      return sendSuccess(res, tokens, 'Tokens refreshed');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }
      const result = await AuthService.logout(req.user.userId);
      return sendSuccess(res, result, 'Successfully logged out');
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }
      const data = await AuthService.getMe(req.user.userId);
      return sendSuccess(res, data);
    } catch (err: any) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode, err.code);
      }
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }
      const updatedUser = await AuthService.updateProfile(req.user.userId, req.body);
      return sendSuccess(res, updatedUser, 'Profile updated successfully');
    } catch (err: any) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode, err.code);
      }
      next(err);
    }
  }

  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }
      const notifications = await AuthService.getNotifications(req.user.userId);
      return sendSuccess(res, notifications);
    } catch (err) {
      next(err);
    }
  }

  static async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }
      const notification = await AuthService.markNotificationRead(req.user.userId, req.params.id);
      if (!notification) {
        return sendError(res, 'Notification not found', 404, 'NOT_FOUND');
      }
      return sendSuccess(res, notification, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }
}
