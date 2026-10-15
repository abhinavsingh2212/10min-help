import mongoose, { Schema, Document } from 'mongoose';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  VehicleType,
} from '@10min-help/shared';

export interface IBookingStatusHistory {
  status: BookingStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
}

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId;
  vehicle: {
    vehicleId?: mongoose.Types.ObjectId;
    vehicleType: VehicleType;
    manufacturer: string;
    model: string;
    registrationNumber?: string;
    color?: string;
  };
  service: mongoose.Types.ObjectId;
  pickupLocation: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    landmark?: string;
    city?: string;
  };
  technician?: mongoose.Types.ObjectId;
  status: BookingStatus;
  initialPrice: number;
  quotedPrice: number;
  approvedFinalAmount: number;
  isQuoteApprovedByCustomer: boolean;
  quoteRevisionReason?: string;
  notes?: string;
  statusHistory: IBookingStatusHistory[];
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  estimatedEtaMinutes?: number;
  technicianLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    heading?: number;
    lastUpdated?: Date;
  };
  cancellationReason?: string;
  cancelledBy?: string;
  requestedAt: Date;
  assignedAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: {
      vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
      vehicleType: { type: String, enum: Object.values(VehicleType), required: true },
      manufacturer: { type: String, required: true },
      model: { type: String, required: true },
      registrationNumber: { type: String },
      color: { type: String },
    },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    pickupLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: { type: String },
      landmark: { type: String },
      city: { type: String },
    },
    technician: { type: Schema.Types.ObjectId, ref: 'Technician', index: true },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.REQUESTED,
      index: true,
    },
    initialPrice: { type: Number, required: true, min: 0 },
    quotedPrice: { type: Number, required: true, min: 0 },
    approvedFinalAmount: { type: Number, required: true, min: 0 },
    isQuoteApprovedByCustomer: { type: Boolean, default: true },
    quoteRevisionReason: { type: String },
    notes: { type: String },
    statusHistory: [
      {
        status: { type: String, enum: Object.values(BookingStatus), required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        updatedBy: { type: String },
      },
    ],
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod) },
    estimatedEtaMinutes: { type: Number },
    technicianLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      heading: { type: Number },
      lastUpdated: { type: Date },
    },
    cancellationReason: { type: String },
    cancelledBy: { type: String },
    requestedAt: { type: Date, default: Date.now },
    assignedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
BookingSchema.index({ customer: 1, status: 1 });
BookingSchema.index({ technician: 1, status: 1 });

export const BookingModel = mongoose.model<IBooking>('Booking', BookingSchema);
