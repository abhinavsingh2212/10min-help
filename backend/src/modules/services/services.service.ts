import { ServiceModel, IService } from '../../models/Service';
import { VehicleType } from '@10min-help/shared';

export class ServicesService {
  static async getAllServices(vehicleType?: VehicleType): Promise<IService[]> {
    const query: Record<string, unknown> = { isActive: true };
    if (vehicleType) {
      query.supportedVehicles = vehicleType;
    }
    return ServiceModel.find(query).sort({ category: 1 });
  }

  static async getServiceById(id: string): Promise<IService | null> {
    return ServiceModel.findById(id);
  }

  static async calculatePrice(serviceId: string, vehicleType: VehicleType): Promise<{
    service: IService;
    startingPrice: number;
    estimatedDurationMinutes: number;
  }> {
    const service = await ServiceModel.findById(serviceId);
    if (!service) {
      throw new Error(`Service '${serviceId}' not found.`);
    }

    if (!service.isActive) {
      throw new Error(`Service '${service.name}' is currently unavailable.`);
    }

    if (!service.supportedVehicles.includes(vehicleType)) {
      throw new Error(`Service '${service.name}' does not support vehicle type '${vehicleType}'.`);
    }

    const startingPrice = service.startingPrice[vehicleType];
    return {
      service,
      startingPrice,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
    };
  }
}
