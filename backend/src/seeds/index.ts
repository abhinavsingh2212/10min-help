import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { UserModel } from '../models/User';
import { VehicleModel } from '../models/Vehicle';
import { TechnicianModel } from '../models/Technician';
import { ServiceModel } from '../models/Service';
import { ServiceAreaModel } from '../models/ServiceArea';
import { BookingModel } from '../models/Booking';
import { PaymentModel } from '../models/Payment';
import { ReviewModel } from '../models/Review';
import { AuditLogModel } from '../models/AuditLog';
import {
  BookingStatus,
  INITIAL_SERVICE_CATALOGUE,
  PaymentMethod,
  PaymentStatus,
  ServiceCategory,
  TechnicianVerificationStatus,
  UserRole,
  VehicleType,
} from '@10min-help/shared';
import { logger } from '../config/logger';

export async function runSeeds() {
  await connectDB();
  logger.info('[Seed] Cleaning old database collections...');

  await Promise.all([
    UserModel.deleteMany({}),
    VehicleModel.deleteMany({}),
    TechnicianModel.deleteMany({}),
    ServiceModel.deleteMany({}),
    ServiceAreaModel.deleteMany({}),
    BookingModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
  ]);

  logger.info('[Seed] Seeding service catalogue...');
  const seededServices = await ServiceModel.insertMany(
    INITIAL_SERVICE_CATALOGUE.map((s) => ({
      ...s,
      isActive: true,
    }))
  );

  logger.info('[Seed] Seeding pilot service zones...');
  await ServiceAreaModel.insertMany([
    {
      city: 'Bangalore',
      zoneName: 'Indiranagar & Central',
      centerCoordinates: { type: 'Point', coordinates: [77.6408, 12.9784] },
      radiusKm: 12,
      isActive: true,
    },
    {
      city: 'Bangalore',
      zoneName: 'Koramangala & HSR',
      centerCoordinates: { type: 'Point', coordinates: [77.6271, 12.9352] },
      radiusKm: 10,
      isActive: true,
    },
    {
      city: 'New Delhi',
      zoneName: 'Connaught Place & Central',
      centerCoordinates: { type: 'Point', coordinates: [77.2167, 28.6328] },
      radiusKm: 15,
      isActive: true,
    },
  ]);

  logger.info('[Seed] Seeding users (Admin, Customers, Technicians)...');
  const admin = await UserModel.create({
    name: 'Admin Supervisor',
    phone: '9999999999',
    email: 'admin@10minhelp.in',
    role: UserRole.ADMIN,
    isActive: true,
  });

  const customer = await UserModel.create({
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul@example.com',
    role: UserRole.CUSTOMER,
    emergencyContactName: 'Priya Sharma (Spouse)',
    emergencyContactPhone: '9876543211',
    isActive: true,
  });

  const bike = await VehicleModel.create({
    owner: customer._id,
    vehicleType: VehicleType.BIKE,
    manufacturer: 'Royal Enfield',
    model: 'Classic 350',
    registrationNumber: 'KA01AB1234',
    color: 'Stealth Black',
    isDefault: true,
  });

  const car = await VehicleModel.create({
    owner: customer._id,
    vehicleType: VehicleType.CAR,
    manufacturer: 'Hyundai',
    model: 'Creta SX(O)',
    registrationNumber: 'KA05CD5678',
    color: 'Polar White',
    isDefault: false,
  });

  // Technician 1: Suresh (Verified, Online, near Indiranagar)
  const techUser1 = await UserModel.create({
    name: 'Suresh Kumar',
    phone: '9876500001',
    email: 'suresh.mechanic@example.com',
    role: UserRole.TECHNICIAN,
    isActive: true,
  });

  const tech1 = await TechnicianModel.create({
    user: techUser1._id,
    verificationStatus: TechnicianVerificationStatus.VERIFIED,
    verifiedAt: new Date(),
    skills: Object.values(ServiceCategory),
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    serviceAreas: ['Indiranagar', 'Bangalore Central'],
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [77.6415, 12.9790], // Indiranagar 100ft road
      address: '100ft Road, Indiranagar, Bengaluru',
      lastUpdatedAt: new Date(),
    },
    ratingAverage: 4.9,
    ratingCount: 142,
    totalJobsCompleted: 142,
    experienceYears: 8,
    businessName: 'Suresh Multi-Brand Roadside Care',
  });

  // Technician 2: Ramesh (Verified, Online, Koramangala)
  const techUser2 = await UserModel.create({
    name: 'Ramesh Verma',
    phone: '9876500002',
    email: 'ramesh.auto@example.com',
    role: UserRole.TECHNICIAN,
    isActive: true,
  });

  const tech2 = await TechnicianModel.create({
    user: techUser2._id,
    verificationStatus: TechnicianVerificationStatus.VERIFIED,
    verifiedAt: new Date(),
    skills: [
      ServiceCategory.PUNCTURE,
      ServiceCategory.BATTERY,
      ServiceCategory.NOT_STARTING,
      ServiceCategory.FUEL,
      ServiceCategory.TYRE_CHANGE,
    ],
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    serviceAreas: ['Koramangala', 'HSR Layout'],
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [77.6250, 12.9340], // Koramangala 4th block
      address: '4th Block, Koramangala, Bengaluru',
      lastUpdatedAt: new Date(),
    },
    ratingAverage: 4.8,
    ratingCount: 96,
    totalJobsCompleted: 96,
    experienceYears: 6,
    businessName: 'Ramesh Quick Assist',
  });

  // Technician 3: Vikram (Pending Verification for Admin Review Queue)
  const techUser3 = await UserModel.create({
    name: 'Vikram Singh',
    phone: '9876500003',
    email: 'vikram.towing@example.com',
    role: UserRole.TECHNICIAN,
    isActive: true,
  });

  await TechnicianModel.create({
    user: techUser3._id,
    verificationStatus: TechnicianVerificationStatus.PENDING,
    skills: [ServiceCategory.TOWING, ServiceCategory.MINOR_REPAIR],
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    serviceAreas: ['Outer Ring Road', 'Whitefield'],
    isOnline: false,
    experienceYears: 4,
    businessName: 'Vikram Heavy Towing & Logistics',
  });

  logger.info('[Seed] Seeding past completed booking with payment and review for KPIs...');
  const punctureService = seededServices.find((s) => s.category === ServiceCategory.PUNCTURE)!;
  const requestedTime = new Date(Date.now() - 45 * 60 * 1000);
  const arrivedTime = new Date(requestedTime.getTime() + 8 * 60 * 1000); // 8 mins arrival (within 10-min target)
  const completedTime = new Date(arrivedTime.getTime() + 15 * 60 * 1000);

  const pastBooking = await BookingModel.create({
    customer: customer._id,
    vehicle: {
      vehicleId: bike._id,
      vehicleType: VehicleType.BIKE,
      manufacturer: bike.manufacturer,
      model: bike.model,
      registrationNumber: bike.registrationNumber,
    },
    service: punctureService._id,
    pickupLocation: {
      type: 'Point',
      coordinates: [77.6400, 12.9780],
      address: '12th Main Rd, Indiranagar, Bengaluru',
    },
    technician: tech1._id,
    status: BookingStatus.COMPLETED,
    initialPrice: 120,
    quotedPrice: 120,
    approvedFinalAmount: 120,
    isQuoteApprovedByCustomer: true,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.UPI,
    estimatedEtaMinutes: 8,
    requestedAt: requestedTime,
    assignedAt: new Date(requestedTime.getTime() + 20 * 1000),
    arrivedAt: arrivedTime,
    startedAt: arrivedTime,
    completedAt: completedTime,
    statusHistory: [
      { status: BookingStatus.REQUESTED, timestamp: requestedTime, note: 'Initial request' },
      { status: BookingStatus.SEARCHING, timestamp: new Date(requestedTime.getTime() + 5000), note: 'Searching mechanics' },
      { status: BookingStatus.ASSIGNED, timestamp: new Date(requestedTime.getTime() + 20000), note: 'Assigned to Suresh Kumar' },
      { status: BookingStatus.EN_ROUTE, timestamp: new Date(requestedTime.getTime() + 60000), note: 'En route' },
      { status: BookingStatus.ARRIVED, timestamp: arrivedTime, note: 'Technician reached customer' },
      { status: BookingStatus.IN_PROGRESS, timestamp: arrivedTime, note: 'Puncture repair started' },
      { status: BookingStatus.COMPLETED, timestamp: completedTime, note: 'Job completed successfully' },
    ],
  });

  await PaymentModel.create({
    booking: pastBooking._id,
    customer: customer._id,
    amount: 120,
    currency: 'INR',
    status: PaymentStatus.PAID,
    method: PaymentMethod.UPI,
    provider: 'razorpay',
    providerOrderId: 'order_seed_123',
    providerPaymentId: 'pay_seed_456',
    paidAt: completedTime,
  });

  await ReviewModel.create({
    booking: pastBooking._id,
    customer: customer._id,
    technician: tech1._id,
    rating: 5,
    comment: 'Arrived in just 8 minutes! Fixed tubeless puncture swiftly. Very professional technician.',
  });

  await AuditLogModel.create({
    actorId: admin._id,
    actorRole: 'ADMIN',
    action: 'SYSTEM_SEEDED',
    entityType: 'System',
    entityId: 'seed_init',
    metadata: { demoData: true },
  });

  logger.info('[Seed] Seeding completed successfully!');
  logger.info('=======================================================');
  logger.info('  DEMO CREDENTIALS FOR TESTING:');
  logger.info('  Customer: Phone "9876543210", OTP "123456"');
  logger.info('  Mechanic 1: Phone "9876500001", OTP "123456" (Suresh - Indiranagar)');
  logger.info('  Mechanic 2: Phone "9876500002", OTP "123456" (Ramesh - Koramangala)');
  logger.info('  Admin: Phone "9999999999", OTP "123456"');
  logger.info('=======================================================');
}

if (require.main === module) {
  runSeeds()
    .then(() => disconnectDB())
    .catch((err) => {
      logger.error('Seed failed:', err);
      process.exit(1);
    });
}
