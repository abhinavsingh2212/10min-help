import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: code || 'BAD_REQUEST',
      details,
    },
  });
}
