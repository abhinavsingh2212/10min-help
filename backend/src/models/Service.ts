import mongoose, { Schema, Document } from 'mongoose';
import { ServiceCategory, VehicleType } from '@10min-help/shared';

export interface IService extends Document {
  category: ServiceCategory;
  name: string;
  description: string;
  inclusions: string[];
  startingPrice: {
    [VehicleType.BIKE]: number;
    [VehicleType.CAR]: number;
  };
  supportedVehicles: VehicleType[];
  estimatedDurationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    category: {
      type: String,
      enum: Object.values(ServiceCategory),
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    inclusions: [{ type: String, trim: true }],
    startingPrice: {
      [VehicleType.BIKE]: { type: Number, required: true, min: 0 },
      [VehicleType.CAR]: { type: Number, required: true, min: 0 },
    },
    supportedVehicles: [
      {
        type: String,
        enum: Object.values(VehicleType),
      },
    ],
    estimatedDurationMinutes: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const ServiceModel = mongoose.model<IService>('Service', ServiceSchema);
