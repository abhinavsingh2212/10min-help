import { Request, Response, NextFunction } from 'express';
import { TechniciansService } from './technicians.service';
import { sendSuccess, sendError } from '../../utils/response';

export class TechniciansController {
  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const technician = await TechniciansService.apply(req.user!.userId, req.body);
      return sendSuccess(res, technician, 'Application submitted for admin review', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await TechniciansService.getProfileByUserId(req.user!.userId);
      if (!profile) return sendError(res, 'Technician profile not found', 404, 'NOT_FOUND');
      return sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  }

  static async setAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { isOnline } = req.body;
      const technician = await TechniciansService.setAvailability(req.user!.userId, isOnline);
      return sendSuccess(res, technician, `You are now ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const technician = await TechniciansService.updateLocation(req.user!.userId, req.body);
      return sendSuccess(res, technician, 'Location updated');
    } catch (err) {
      next(err);
    }
  }

  static async getActiveJob(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await TechniciansService.getActiveJob(req.user!.userId);
      return sendSuccess(res, job);
    } catch (err) {
      next(err);
    }
  }

  static async getEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const earnings = await TechniciansService.getEarnings(req.user!.userId);
      return sendSuccess(res, earnings);
    } catch (err) {
      next(err);
    }
  }
}
