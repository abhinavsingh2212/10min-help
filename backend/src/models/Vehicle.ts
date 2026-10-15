import mongoose, { Schema, Document } from 'mongoose';
import { VehicleType } from '@10min-help/shared';

export interface IVehicle {
  _id?: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  vehicleType: VehicleType;
  manufacturer: string;
  model: string;
  registrationNumber?: string;
  color?: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
      index: true,
    },
    manufacturer: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    registrationNumber: { type: String, uppercase: true, trim: true },
    color: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const VehicleModel = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
