import { z } from 'zod';
import {
  BookingStatus,
  PaymentMethod,
  ServiceCategory,
  TechnicianVerificationStatus,
  UserRole,
  VehicleType,
} from '../enums';

// Phone regex: accepts any standard 10-15 digit phone number (with optional '+' country prefix, spaces, or dashes)
const phoneRegex = /^\+?[\d\s-]{7,18}$/;

export function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.trim().replace(/[\s-()]/g, '');
  if (/^\+91\d{10}$/.test(cleaned)) {
    return cleaned.slice(3);
  }
  if (/^91\d{10}$/.test(cleaned)) {
    return cleaned.slice(2);
  }
  if (/^0\d{10}$/.test(cleaned)) {
    return cleaned.slice(1);
  }
  return cleaned;
}

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .transform(normalizePhoneNumber)
    .refine((val) => /^\+?\d{7,15}$/.test(val), 'Please enter a valid 10-digit Indian phone number'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.CUSTOMER),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .transform(normalizePhoneNumber)
    .refine((val) => /^\+?\d{7,15}$/.test(val), 'Please enter a valid 10-digit Indian phone number'),
  otp: z.string().trim().length(6, 'OTP must be 6 digits'),
  name: z.string().trim().min(2, 'Name must have at least 2 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters').max(100).optional(),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal('')),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .transform((v) => (v ? normalizePhoneNumber(v) : v))
    .refine((v) => !v || /^\+?\d{7,15}$/.test(v), 'Please enter a valid emergency contact phone number')
    .optional(),
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

export const recordCashPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  notes: z.string().max(300).optional(),
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

export const adminUpdateServicePricingSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  inclusions: z.array(z.string()).optional(),
  startingPrice: z
    .object({
      [VehicleType.BIKE]: z.number().min(0).optional(),
      [VehicleType.CAR]: z.number().min(0).optional(),
    })
    .optional(),
  estimatedDurationMinutes: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});
