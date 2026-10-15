import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';
import { ENV } from '../config/env';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Unhandled Error:', err);

  // Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return sendError(res, `Invalid resource identifier: ${err.value}`, 400, 'INVALID_ID');
  }

  // Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(res, `Duplicate value for '${field}'. Must be unique.`, 409, 'DUPLICATE_KEY');
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e: any) => e.message);
    return sendError(res, 'Database validation error', 422, 'VALIDATION_ERROR', details);
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && ENV.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal Server Error';

  return sendError(res, message, statusCode, err.code || 'INTERNAL_ERROR', err.details);
}
