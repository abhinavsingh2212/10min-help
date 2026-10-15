import mongoose from 'mongoose';
import { BookingModel } from '../../models/Booking';
import { ReviewModel, IReview } from '../../models/Review';
import { TechnicianModel } from '../../models/Technician';
import { BookingStatus } from '@10min-help/shared';

export class ReviewsService {
  static async createReview(
    customerId: string,
    bookingId: string,
    rating: number,
    comment?: string
  ): Promise<IReview> {
    const booking = await BookingModel.findOne({ _id: bookingId, customer: customerId });
    if (!booking) throw new Error('Booking not found or does not belong to you');

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new Error(`Reviews can only be submitted for COMPLETED jobs (Current: ${booking.status})`);
    }

    if (!booking.technician) {
      throw new Error('No technician was assigned to this booking');
    }

    // Check if review already exists
    const existing = await ReviewModel.findOne({ booking: booking._id });
    if (existing) {
      throw new Error('A review has already been submitted for this booking');
    }

    const review = await ReviewModel.create({
      booking: booking._id,
      customer: new mongoose.Types.ObjectId(customerId),
      technician: booking.technician,
      rating,
      comment,
    });

    // Update technician aggregate rating
    const tech = await TechnicianModel.findById(booking.technician);
    if (tech) {
      const currentTotal = tech.ratingAverage * tech.ratingCount;
      tech.ratingCount += 1;
      tech.ratingAverage = Math.round(((currentTotal + rating) / tech.ratingCount) * 10) / 10;
      await tech.save();
    }

    return review;
  }

  static async getReviewsByTechnician(technicianId: string) {
    return ReviewModel.find({ technician: technicianId })
      .populate('customer', 'name avatarUrl')
      .sort({ createdAt: -1 });
  }

  static async getBookingReview(bookingId: string) {
    return ReviewModel.findOne({ booking: bookingId });
  }
}
