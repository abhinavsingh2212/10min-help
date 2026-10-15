import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

export class AuthController {
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, role } = req.body;
      const result = await AuthService.sendOtp(phone, role);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp, name, role } = req.body;
      const result = await AuthService.verifyOtp(phone, otp, name, role);
      return sendSuccess(res, result, 'Authentication successful');
    } catch (err: any) {
      return sendError(res, err.message || 'OTP verification failed', 400, 'AUTH_FAILED');
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
      return sendError(res, err.message, 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  static async logout(_req: Request, res: Response) {
    return sendSuccess(res, { loggedOut: true }, 'Successfully logged out');
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }
      const data = await AuthService.getMe(req.user.userId);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}
