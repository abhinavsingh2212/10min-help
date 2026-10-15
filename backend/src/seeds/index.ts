import { connectDB, disconnectDB } from '../config/db';
import { ENV } from '../config/env';
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

export interface SeedOptions {
  /**
   * When true, wipes existing collections before seeding (blocked in production).
   * Defaults to false (non-destructive idempotent upsert).
   */
  reset?: boolean;
  /**
   * When true, connects to DB before seeding. Defaults to true.
   */
  connect?: boolean;
}

export async function runSeeds(options: SeedOptions = {}) {
  const shouldConnect = options.connect ?? true;
  const shouldReset = options.reset ?? process.argv.includes('--reset');

  if (shouldConnect) {
    await connectDB();
  }

  if (shouldReset) {
    if (ENV.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
      throw new Error(
        'Refusing to run destructive seed (--reset) in production environment.'
      );
    }
    logger.warn('[Seed] Destructive reset requested (--reset): cleaning database collections...');
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
  } else {
    logger.info('[Seed] Running non-destructive idempotent seed (preserving existing records)...');
  }

  logger.info('[Seed] Upserting service catalogue...');
  const seededServices = await Promise.all(
    INITIAL_SERVICE_CATALOGUE.map((s) =>
      ServiceModel.findOneAndUpdate(
        { category: s.category },
        {
          $setOnInsert: {
            category: s.category,
            isActive: true,
          },
          $set: {
            name: s.name,
            startingPrice: s.startingPrice,
            description: s.description,
            inclusions: s.inclusions,
            supportedVehicles: s.supportedVehicles,
            estimatedDurationMinutes: s.estimatedDurationMinutes,
          },
        },
        { upsert: true, new: true }
      )
    )
  );

  logger.info('[Seed] Upserting pilot service zones...');
  const pilotZones = [
    {
      city: 'Bangalore',
      zoneName: 'Indiranagar & Central',
      centerCoordinates: { type: 'Point', coordinates: [77.6408, 12.9784] as [number, number] },
      radiusKm: 12,
      isActive: true,
    },
    {
      city: 'Bangalore',
      zoneName: 'Koramangala & HSR',
      centerCoordinates: { type: 'Point', coordinates: [77.6271, 12.9352] as [number, number] },
      radiusKm: 10,
      isActive: true,
    },
    {
      city: 'New Delhi',
      zoneName: 'Connaught Place & Central',
      centerCoordinates: { type: 'Point', coordinates: [77.2167, 28.6328] as [number, number] },
      radiusKm: 15,
      isActive: true,
    },
  ];

  for (const zone of pilotZones) {
    await ServiceAreaModel.findOneAndUpdate(
      { city: zone.city, zoneName: zone.zoneName },
      { $set: zone },
      { upsert: true, new: true }
    );
  }

  logger.info('[Seed] Upserting demo accounts (Admin, Customer, Technicians)...');
  const admin = await UserModel.findOneAndUpdate(
    { phone: '9999999999' },
    {
      $set: {
        name: 'Admin Supervisor',
        phone: '9999999999',
        email: 'admin@10minhelp.in',
        role: UserRole.ADMIN,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const customer = await UserModel.findOneAndUpdate(
    { phone: '9876543210' },
    {
      $set: {
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        role: UserRole.CUSTOMER,
        emergencyContactName: 'Priya Sharma (Spouse)',
        emergencyContactPhone: '9876543211',
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const bike = await VehicleModel.findOneAndUpdate(
    { owner: customer._id, registrationNumber: 'KA01AB1234' },
    {
      $set: {
        owner: customer._id,
        vehicleType: VehicleType.BIKE,
        manufacturer: 'Royal Enfield',
        model: 'Classic 350',
        registrationNumber: 'KA01AB1234',
        color: 'Stealth Black',
        isDefault: true,
      },
    },
    { upsert: true, new: true }
  );

  await VehicleModel.findOneAndUpdate(
    { owner: customer._id, registrationNumber: 'KA05CD5678' },
    {
      $set: {
        owner: customer._id,
        vehicleType: VehicleType.CAR,
        manufacturer: 'Hyundai',
        model: 'Creta SX(O)',
        registrationNumber: 'KA05CD5678',
        color: 'Polar White',
        isDefault: false,
      },
    },
    { upsert: true, new: true }
  );

  // Technician 1: Suresh (Verified, Online, near Indiranagar)
  const techUser1 = await UserModel.findOneAndUpdate(
    { phone: '9876500001' },
    {
      $set: {
        name: 'Suresh Kumar',
        phone: '9876500001',
        email: 'suresh.mechanic@example.com',
        role: UserRole.TECHNICIAN,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const tech1 = await TechnicianModel.findOneAndUpdate(
    { user: techUser1._id },
    {
      $set: {
        user: techUser1._id,
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        skills: Object.values(ServiceCategory),
        supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
        serviceAreas: ['Indiranagar', 'Bangalore Central'],
        isOnline: true,
        currentLocation: {
          type: 'Point',
          coordinates: [77.6415, 12.979],
          address: '100ft Road, Indiranagar, Bengaluru',
          lastUpdatedAt: new Date(),
        },
        ratingAverage: 4.9,
        ratingCount: 142,
        totalJobsCompleted: 142,
        experienceYears: 8,
        businessName: 'Suresh Multi-Brand Roadside Care',
      },
    },
    { upsert: true, new: true }
  );

  // Technician 2: Ramesh (Verified, Online, Koramangala)
  const techUser2 = await UserModel.findOneAndUpdate(
    { phone: '9876500002' },
    {
      $set: {
        name: 'Ramesh Verma',
        phone: '9876500002',
        email: 'ramesh.auto@example.com',
        role: UserRole.TECHNICIAN,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  await TechnicianModel.findOneAndUpdate(
    { user: techUser2._id },
    {
      $set: {
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
          coordinates: [77.625, 12.934],
          address: '4th Block, Koramangala, Bengaluru',
          lastUpdatedAt: new Date(),
        },
        ratingAverage: 4.8,
        ratingCount: 96,
        totalJobsCompleted: 96,
        experienceYears: 6,
        businessName: 'Ramesh Quick Assist',
      },
    },
    { upsert: true, new: true }
  );

  // Technician 3: Vikram (Pending Verification for Admin Review Queue)
  const techUser3 = await UserModel.findOneAndUpdate(
    { phone: '9876500003' },
    {
      $set: {
        name: 'Vikram Singh',
        phone: '9876500003',
        email: 'vikram.towing@example.com',
        role: UserRole.TECHNICIAN,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  await TechnicianModel.findOneAndUpdate(
    { user: techUser3._id },
    {
      $set: {
        user: techUser3._id,
        verificationStatus: TechnicianVerificationStatus.PENDING,
        skills: [ServiceCategory.TOWING, ServiceCategory.MINOR_REPAIR],
        supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
        serviceAreas: ['Outer Ring Road', 'Whitefield'],
        isOnline: false,
        experienceYears: 4,
        businessName: 'Vikram Heavy Towing & Logistics',
      },
    },
    { upsert: true, new: true }
  );

  // Only create the sample past completed booking if none exists for demo customer
  const existingPastBooking = await BookingModel.findOne({
    customer: customer._id,
    status: BookingStatus.COMPLETED,
  });

  if (!existingPastBooking) {
    logger.info('[Seed] Creating sample completed booking with payment and review...');
    const punctureService = seededServices.find((s) => s.category === ServiceCategory.PUNCTURE)!;
    const requestedTime = new Date(Date.now() - 45 * 60 * 1000);
    const arrivedTime = new Date(requestedTime.getTime() + 8 * 60 * 1000);
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
        coordinates: [77.64, 12.978],
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
  }

  await AuditLogModel.create({
    actorId: admin._id,
    actorRole: 'ADMIN',
    action: 'SYSTEM_SEEDED',
    entityType: 'System',
    entityId: 'seed_init',
    metadata: { demoData: true, reset: shouldReset },
  });

  logger.info('[Seed] Seeding completed successfully!');
}

if (require.main === module) {
  runSeeds()
    .then(() => disconnectDB())
    .catch((err) => {
      logger.error('Seed failed:', err);
      process.exit(1);
    });
}
