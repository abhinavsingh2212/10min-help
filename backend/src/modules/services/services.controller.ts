import { Request, Response, NextFunction } from 'express';
import { ServicesService } from './services.service';
import { VehicleType } from '@10min-help/shared';
import { sendSuccess, sendError } from '../../utils/response';

export class ServicesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicleType = req.query.vehicleType as VehicleType | undefined;
      const services = await ServicesService.getAllServices(vehicleType);
      return sendSuccess(res, services);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await ServicesService.getServiceById(req.params.id);
      if (!service) return sendError(res, 'Service not found', 404, 'NOT_FOUND');
      return sendSuccess(res, service);
    } catch (err) {
      next(err);
    }
  }

  static async quote(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceId, vehicleType } = req.query;
      if (!serviceId || !vehicleType) {
        return sendError(res, 'serviceId and vehicleType are required query parameters', 400);
      }
      const quote = await ServicesService.calculatePrice(serviceId as string, vehicleType as VehicleType);
      return sendSuccess(res, quote);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
