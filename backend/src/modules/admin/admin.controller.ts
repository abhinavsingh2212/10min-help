import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { sendSuccess, sendError } from '../../utils/response';

export class AdminController {
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const from = req.query.from as string | undefined;
      const metrics = await AdminService.getDashboardMetrics(from);
      return sendSuccess(res, metrics);
    } catch (err) {
      next(err);
    }
  }

  static async getLiveMap(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AdminService.getLiveDispatchMapData();
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async listBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as any;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await AdminService.listBookings({ status, page, limit });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async manualAssign(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;
      const { technicianId } = req.body;
      const booking = await AdminService.manualAssign(bookingId, technicianId, req.user!.userId);
      return sendSuccess(res, booking, 'Technician manually assigned');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async listTechnicians(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as any;
      const technicians = await AdminService.listTechnicians({ status });
      return sendSuccess(res, technicians);
    } catch (err) {
      next(err);
    }
  }

  static async updateTechnicianVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const tech = await AdminService.updateTechnicianVerification(id, status, notes, req.user!.userId);
      return sendSuccess(res, tech, `Technician verification status updated to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateServicePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { startingPrice, isActive } = req.body;
      const service = await AdminService.updateServicePricing(id, startingPrice || {}, isActive, req.user!.userId);
      return sendSuccess(res, service, 'Service pricing updated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await AdminService.getAuditLogs(limit);
      return sendSuccess(res, logs);
    } catch (err) {
      next(err);
    }
  }
}
