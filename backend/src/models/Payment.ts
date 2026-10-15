import mongoose, { Schema, Document } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '@10min-help/shared';

export interface IPayment extends Document {
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.UPI,
    },
    provider: { type: String, default: 'mock' },
    providerOrderId: { type: String, index: true },
    providerPaymentId: { type: String, index: true },
    providerSignature: { type: String },
    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema);
