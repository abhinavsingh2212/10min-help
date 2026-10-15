import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@10min-help/shared';
import { sendError } from '../utils/response';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
        403,
        'FORBIDDEN'
      );
    }

    return next();
  };
}
