import mongoose from 'mongoose';
import { VehicleModel, IVehicle } from '../../models/Vehicle';
import { VehicleType } from '@10min-help/shared';

export interface CreateVehicleInput {
  vehicleType: VehicleType;
  manufacturer: string;
  model: string;
  registrationNumber?: string;
  color?: string;
  isDefault?: boolean;
}

export class VehiclesService {
  static async createVehicle(ownerId: string, data: CreateVehicleInput): Promise<IVehicle> {
    // If set as default, unset other defaults
    if (data.isDefault) {
      await VehicleModel.updateMany({ owner: ownerId }, { isDefault: false });
    } else {
      // If this is the owner's first vehicle, make it default automatically
      const count = await VehicleModel.countDocuments({ owner: ownerId });
      if (count === 0) {
        data.isDefault = true;
      }
    }

    const vehicle = await VehicleModel.create({
      owner: new mongoose.Types.ObjectId(ownerId),
      ...data,
    });
    return vehicle;
  }

  static async getVehiclesByOwner(ownerId: string): Promise<IVehicle[]> {
    return VehicleModel.find({ owner: ownerId }).sort({ isDefault: -1, createdAt: -1 });
  }

  static async getVehicleById(vehicleId: string, ownerId: string): Promise<IVehicle | null> {
    return VehicleModel.findOne({ _id: vehicleId, owner: ownerId });
  }

  static async updateVehicle(
    vehicleId: string,
    ownerId: string,
    data: Partial<CreateVehicleInput>
  ): Promise<IVehicle | null> {
    if (data.isDefault) {
      await VehicleModel.updateMany({ owner: ownerId }, { isDefault: false });
    }
    return VehicleModel.findOneAndUpdate(
      { _id: vehicleId, owner: ownerId },
      { $set: data },
      { new: true }
    );
  }

  static async deleteVehicle(vehicleId: string, ownerId: string): Promise<boolean> {
    const res = await VehicleModel.deleteOne({ _id: vehicleId, owner: ownerId });
    return res.deletedCount > 0;
  }
}
