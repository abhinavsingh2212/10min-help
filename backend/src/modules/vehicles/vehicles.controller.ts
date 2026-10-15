import { Request, Response, NextFunction } from 'express';
import { VehiclesService } from './vehicles.service';
import { sendSuccess, sendError } from '../../utils/response';

export class VehiclesController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicle = await VehiclesService.createVehicle(req.user!.userId, req.body);
      return sendSuccess(res, vehicle, 'Vehicle added successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicles = await VehiclesService.getVehiclesByOwner(req.user!.userId);
      return sendSuccess(res, vehicles);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicle = await VehiclesService.getVehicleById(req.params.id, req.user!.userId);
      if (!vehicle) return sendError(res, 'Vehicle not found', 404, 'NOT_FOUND');
      return sendSuccess(res, vehicle);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicle = await VehiclesService.updateVehicle(req.params.id, req.user!.userId, req.body);
      if (!vehicle) return sendError(res, 'Vehicle not found', 404, 'NOT_FOUND');
      return sendSuccess(res, vehicle, 'Vehicle updated');
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await VehiclesService.deleteVehicle(req.params.id, req.user!.userId);
      if (!deleted) return sendError(res, 'Vehicle not found', 404, 'NOT_FOUND');
      return sendSuccess(res, { deleted: true }, 'Vehicle deleted');
    } catch (err) {
      next(err);
    }
  }
}
