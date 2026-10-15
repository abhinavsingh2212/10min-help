import mongoose, { Schema, Document } from 'mongoose';
import {
  ServiceCategory,
  TechnicianVerificationStatus,
  VehicleType,
} from '@10min-help/shared';

export interface ITechnician extends Document {
  user: mongoose.Types.ObjectId;
  verificationStatus: TechnicianVerificationStatus;
  verificationNotes?: string;
  verifiedAt?: Date;
  skills: ServiceCategory[];
  supportedVehicles: VehicleType[];
  serviceAreas: string[];
  isOnline: boolean;
  currentLocation?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude] for GeoJSON
    address?: string;
    lastUpdatedAt?: Date;
  };
  ratingAverage: number;
  ratingCount: number;
  totalJobsCompleted: number;
  experienceYears?: number;
  businessName?: string;
  activeBookingId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianSchema = new Schema<ITechnician>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    verificationStatus: {
      type: String,
      enum: Object.values(TechnicianVerificationStatus),
      default: TechnicianVerificationStatus.PENDING,
      index: true,
    },
    verificationNotes: { type: String },
    verifiedAt: { type: Date },
    skills: [
      {
        type: String,
        enum: Object.values(ServiceCategory),
      },
    ],
    supportedVehicles: [
      {
        type: String,
        enum: Object.values(VehicleType),
      },
    ],
    serviceAreas: [{ type: String, trim: true }],
    isOnline: { type: Boolean, default: false, index: true },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
      address: { type: String },
      lastUpdatedAt: { type: Date },
    },
    ratingAverage: { type: Number, default: 5.0, min: 1, max: 5 },
    ratingCount: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    experienceYears: { type: Number, default: 1 },
    businessName: { type: String, trim: true },
    activeBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries (sparse so technicians without initial GPS coordinates are allowed)
TechnicianSchema.index({ 'currentLocation.coordinates': '2dsphere' }, { sparse: true });
TechnicianSchema.index({ isOnline: 1, verificationStatus: 1 });

export const TechnicianModel = mongoose.model<ITechnician>('Technician', TechnicianSchema);
