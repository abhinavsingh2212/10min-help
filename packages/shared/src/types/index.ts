import {
  BookingStatus,
  DispatchOfferStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceCategory,
  TechnicianVerificationStatus,
  UserRole,
  VehicleType,
} from '../enums';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  city?: string;
}

export interface UserSummary {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserSummary;
  tokens: AuthTokens;
}

export interface VehicleDTO {
  _id?: string;
  ownerId?: string;
  vehicleType: VehicleType;
  manufacturer: string;
  model: string;
  registrationNumber?: string;
  color?: string;
  createdAt?: string;
}

export interface TechnicianDTO {
  _id: string;
  userId: string | UserSummary;
  verificationStatus: TechnicianVerificationStatus;
  skills: ServiceCategory[];
  supportedVehicles: VehicleType[];
  serviceAreas: string[];
  isOnline: boolean;
  currentLocation?: LocationCoordinates;
  ratingAverage: number;
  ratingCount: number;
  totalJobsCompleted: number;
  experienceYears?: number;
  businessName?: string;
  bankDetailsConfigured?: boolean;
}

export interface ServiceDTO {
  _id: string;
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
}

export interface BookingStatusHistoryEntry {
  status: BookingStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface BookingDTO {
  _id: string;
  customer: string | UserSummary;
  vehicle: VehicleDTO;
  service: ServiceDTO;
  pickupLocation: LocationCoordinates;
  technician?: string | TechnicianDTO;
  status: BookingStatus;
  initialPrice: number;
  quotedPrice: number;
  approvedFinalAmount: number;
  isQuoteApprovedByCustomer: boolean;
  notes?: string;
  statusHistory: BookingStatusHistoryEntry[];
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  estimatedEtaMinutes?: number;
  technicianLocation?: LocationCoordinates;
  cancellationReason?: string;
  cancelledBy?: string;
  requestedAt: string;
  assignedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface DispatchOfferDTO {
  _id: string;
  bookingId: string;
  technicianId: string;
  status: DispatchOfferStatus;
  expiresAt: string;
  respondedAt?: string;
  bookingSummary?: {
    serviceName: string;
    vehicleType: VehicleType;
    customerDistanceKm: number;
    estimatedEtaMinutes: number;
    quotedPrice: number;
    customerAddress?: string;
  };
}

export interface PaymentDTO {
  _id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  createdAt: string;
}

export interface ReviewDTO {
  _id: string;
  bookingId: string;
  customerId: string | UserSummary;
  technicianId: string | TechnicianDTO;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface AuditLogDTO {
  _id: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface OperationalMetricsDTO {
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  averageResponseTimeMinutes: number;
  tenMinuteArrivalRatePercent: number;
  activeAvailableMechanics: number;
  grossBookingValue: number;
  completedPaymentValue: number;
  technicianPayoutLiabilities: number;
}
