import { z } from 'zod';
import {
  BookingStatus,
  PaymentMethod,
  ServiceCategory,
  TechnicianVerificationStatus,
  UserRole,
  VehicleType,
} from '../enums';

// Phone regex: accepts any standard 10-15 digit phone number (with optional '+' country prefix)
const phoneRegex = /^\+?[0-9]{7,15}$/;

export const sendOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Please enter a valid 10-digit Indian phone number'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.CUSTOMER),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Please enter a valid 10-digit Indian phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  name: z.string().min(2, 'Name must have at least 2 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const locationCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
});

export const createVehicleSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
  manufacturer: z.string().min(2, 'Manufacturer is required'),
  model: z.string().min(1, 'Model is required'),
  registrationNumber: z.string().optional(),
  color: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createBookingSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  pickupLocation: locationCoordinatesSchema,
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(3, 'A cancellation reason is required').max(300),
});

export const quoteApprovalSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

export const technicianApplicationSchema = z.object({
  skills: z.array(z.nativeEnum(ServiceCategory)).min(1, 'Select at least one skill'),
  supportedVehicles: z.array(z.nativeEnum(VehicleType)).min(1, 'Select at least one vehicle type'),
  serviceAreas: z.array(z.string()).min(1, 'Select at least one service zone/area'),
  experienceYears: z.number().min(0).max(50).optional(),
  businessName: z.string().optional(),
});

export const technicianLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

export const technicianAvailabilitySchema = z.object({
  isOnline: z.boolean(),
});

export const technicianQuoteRevisionSchema = z.object({
  revisedAmount: z.number().positive('Revised amount must be greater than zero'),
  reason: z.string().min(5, 'Reason for quote revision is required'),
});

export const technicianJobStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  notes: z.string().optional(),
});

export const createPaymentOrderSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  method: z.nativeEnum(PaymentMethod),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  signature: z.string().min(1),
});

export const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const adminAssignBookingSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
});

export const adminTechnicianStatusSchema = z.object({
  status: z.nativeEnum(TechnicianVerificationStatus),
  notes: z.string().optional(),
});

export const adminServiceSchema = z.object({
  category: z.nativeEnum(ServiceCategory),
  name: z.string().min(3),
  description: z.string().min(10),
  inclusions: z.array(z.string()),
  startingPrice: z.object({
    [VehicleType.BIKE]: z.number().min(0),
    [VehicleType.CAR]: z.number().min(0),
  }),
  supportedVehicles: z.array(z.nativeEnum(VehicleType)).min(1),
  estimatedDurationMinutes: z.number().positive(),
  isActive: z.boolean().default(true),
});
