import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/crypto';
import { UserModel } from '../models/User';
import { sendError } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication token missing or invalid', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);

    // Verify user exists, active, and tokenVersion matches to support immediate revocation
    const user = await UserModel.findById(payload.userId).select('isActive tokenVersion role').lean();
    if (!user) {
      return sendError(res, 'User account not found', 401, 'USER_NOT_FOUND');
    }
    if (!user.isActive) {
      return sendError(res, 'User account has been deactivated or suspended', 403, 'ACCOUNT_DEACTIVATED');
    }
    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      return sendError(res, 'Session has been revoked. Please sign in again.', 401, 'SESSION_REVOKED');
    }

    req.user = {
      ...payload,
      role: user.role || payload.role,
    };
    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
}

export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);
      const user = await UserModel.findById(payload.userId).select('isActive tokenVersion role').lean();
      if (
        user &&
        user.isActive &&
        (payload.tokenVersion === undefined || user.tokenVersion === undefined || payload.tokenVersion === user.tokenVersion)
      ) {
        req.user = {
          ...payload,
          role: user.role || payload.role,
        };
      }
    } catch {
      // Ignored for optional auth
    }
  }
  return next();
}

