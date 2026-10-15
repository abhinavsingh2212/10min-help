import mongoose from 'mongoose';
import { TechnicianModel, ITechnician } from '../../models/Technician';
import { BookingModel, IBooking } from '../../models/Booking';
import { PaymentModel } from '../../models/Payment';
import {
  BookingStatus,
  PaymentStatus,
  ServiceCategory,
  TechnicianVerificationStatus,
  VehicleType,
} from '@10min-help/shared';

export class TechniciansService {
  static async apply(
    userId: string,
    data: {
      skills: ServiceCategory[];
      supportedVehicles: VehicleType[];
      serviceAreas: string[];
      experienceYears?: number;
      businessName?: string;
    }
  ): Promise<ITechnician> {
    let tech = await TechnicianModel.findOne({ user: userId });
    if (!tech) {
      tech = await TechnicianModel.create({
        user: new mongoose.Types.ObjectId(userId),
        verificationStatus: TechnicianVerificationStatus.PENDING,
        skills: data.skills,
        supportedVehicles: data.supportedVehicles,
        serviceAreas: data.serviceAreas,
        experienceYears: data.experienceYears,
        businessName: data.businessName,
        isOnline: false,
      });
    } else {
      tech.skills = data.skills;
      tech.supportedVehicles = data.supportedVehicles;
      tech.serviceAreas = data.serviceAreas;
      if (data.experienceYears) tech.experienceYears = data.experienceYears;
      if (data.businessName) tech.businessName = data.businessName;
      tech.verificationStatus = TechnicianVerificationStatus.PENDING; // Re-trigger review
      await tech.save();
    }
    return tech;
  }

  static async getProfileByUserId(userId: string): Promise<ITechnician | null> {
    return TechnicianModel.findOne({ user: userId }).populate('user', 'name phone email avatarUrl');
  }

  static async setAvailability(userId: string, isOnline: boolean): Promise<ITechnician> {
    const tech = await TechnicianModel.findOne({ user: userId });
    if (!tech) {
      throw new Error('Technician profile not found');
    }

    if (isOnline && tech.verificationStatus !== TechnicianVerificationStatus.VERIFIED) {
      throw new Error('Only approved and verified technicians can go online to receive requests.');
    }

    tech.isOnline = isOnline;
    await tech.save();
    return tech;
  }

  static async updateLocation(
    userId: string,
    coords: { latitude: number; longitude: number; address?: string }
  ): Promise<ITechnician> {
    const tech = await TechnicianModel.findOne({ user: userId });
    if (!tech) throw new Error('Technician profile not found');

    tech.currentLocation = {
      type: 'Point',
      coordinates: [coords.longitude, coords.latitude], // GeoJSON order [lon, lat]
      address: coords.address,
      lastUpdatedAt: new Date(),
    };
    await tech.save();
    return tech;
  }

  static async getActiveJob(userId: string): Promise<IBooking | null> {
    const tech = await TechnicianModel.findOne({ user: userId });
    if (!tech) return null;

    return BookingModel.findOne({
      technician: tech._id,
      status: {
        $in: [
          BookingStatus.ASSIGNED,
          BookingStatus.EN_ROUTE,
          BookingStatus.ARRIVED,
          BookingStatus.INSPECTING,
          BookingStatus.AWAITING_CUSTOMER_APPROVAL,
          BookingStatus.IN_PROGRESS,
        ],
      },
    }).populate('customer', 'name phone emergencyContactPhone');
  }

  static async getEarnings(userId: string) {
    const tech = await TechnicianModel.findOne({ user: userId });
    if (!tech) throw new Error('Technician profile not found');

    const completedBookings = await BookingModel.find({
      technician: tech._id,
      status: BookingStatus.COMPLETED,
    }).sort({ completedAt: -1 });

    const totalGross = completedBookings.reduce((sum, b) => sum + (b.approvedFinalAmount || b.quotedPrice || 0), 0);
    const platformCommissionRate = 0.15; // 15% platform fee
    const platformCommission = Math.round(totalGross * platformCommissionRate);
    const netEarnings = totalGross - platformCommission;

    // Check today's earnings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayBookings = completedBookings.filter(
      (b) => b.completedAt && new Date(b.completedAt) >= startOfToday
    );
    const todayGross = todayBookings.reduce((sum, b) => sum + (b.approvedFinalAmount || 0), 0);
    const todayNet = Math.round(todayGross * (1 - platformCommissionRate));

    return {
      totalJobs: completedBookings.length,
      todayJobs: todayBookings.length,
      grossEarnings: totalGross,
      platformCommission,
      netEarnings,
      todayNetEarnings: todayNet,
      currency: 'INR',
      recentJobs: completedBookings.slice(0, 10).map((b) => ({
        bookingId: b._id,
        completedAt: b.completedAt,
        vehicleType: b.vehicle.vehicleType,
        gross: b.approvedFinalAmount,
        net: Math.round(b.approvedFinalAmount * (1 - platformCommissionRate)),
      })),
    };
  }
}
