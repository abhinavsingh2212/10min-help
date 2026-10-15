import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceArea extends Document {
  city: string;
  zoneName: string;
  centerCoordinates: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  radiusKm: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceAreaSchema = new Schema<IServiceArea>(
  {
    city: { type: String, required: true, trim: true, index: true },
    zoneName: { type: String, required: true, trim: true },
    centerCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    radiusKm: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ServiceAreaSchema.index({ 'centerCoordinates.coordinates': '2dsphere' });

export const ServiceAreaModel = mongoose.model<IServiceArea>('ServiceArea', ServiceAreaSchema);
