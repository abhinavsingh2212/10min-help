import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(
          res,
          'Validation failed',
          422,
          'VALIDATION_ERROR',
          err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
        );
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(
          res,
          'Query validation failed',
          422,
          'VALIDATION_ERROR',
          err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
        );
      }
      next(err);
    }
  };
}
