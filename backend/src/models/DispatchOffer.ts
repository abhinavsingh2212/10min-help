import mongoose, { Schema, Document } from 'mongoose';
import { DispatchOfferStatus } from '@10min-help/shared';

export interface IDispatchOffer extends Document {
  booking: mongoose.Types.ObjectId;
  technician: mongoose.Types.ObjectId;
  status: DispatchOfferStatus;
  offeredAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
  roundNumber: number;
  metadata?: {
    distanceKm: number;
    estimatedEtaMinutes: number;
    quotedPrice: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DispatchOfferSchema = new Schema<IDispatchOffer>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    technician: { type: Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(DispatchOfferStatus),
      default: DispatchOfferStatus.PENDING,
      index: true,
    },
    offeredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date },
    roundNumber: { type: Number, default: 1 },
    metadata: {
      distanceKm: { type: Number },
      estimatedEtaMinutes: { type: Number },
      quotedPrice: { type: Number },
    },
  },
  { timestamps: true }
);

DispatchOfferSchema.index({ booking: 1, technician: 1, status: 1 });

export const DispatchOfferModel = mongoose.model<IDispatchOffer>('DispatchOffer', DispatchOfferSchema);
