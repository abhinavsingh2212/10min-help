import { BookingModel } from '../../models/Booking';
import { TechnicianModel } from '../../models/Technician';
import { BookingStatus, SOCKET_EVENTS } from '@10min-help/shared';
import { calculateHaversineDistanceKm, estimateRoadEtaMinutes } from '../../utils/distance';
import { getSocketServer } from '../../sockets';
import { logger } from '../../config/logger';

export class TrackingService {
  static async updateLocation(
    technicianUserId: string,
    coords: { latitude: number; longitude: number; address?: string; heading?: number }
  ) {
    const tech = await TechnicianModel.findOne({ user: technicianUserId });
    if (!tech) throw new Error('Technician not found');

    // Update technician's current location
    tech.currentLocation = {
      type: 'Point',
      coordinates: [coords.longitude, coords.latitude],
      address: coords.address,
      lastUpdatedAt: new Date(),
    };
    await tech.save();

    // Check if technician is currently on an active booking
    const activeBooking = await BookingModel.findOne({
      technician: tech._id,
      status: {
        $in: [
          BookingStatus.ASSIGNED,
          BookingStatus.EN_ROUTE,
          BookingStatus.ARRIVED,
          BookingStatus.INSPECTING,
          BookingStatus.IN_PROGRESS,
        ],
      },
    });

    if (!activeBooking) {
      return { activeBooking: null, location: coords };
    }

    // Calculate updated distance and ETA to customer
    const [customerLon, customerLat] = activeBooking.pickupLocation.coordinates;
    const distanceKm = calculateHaversineDistanceKm(coords.latitude, coords.longitude, customerLat, customerLon);
    const estimatedEtaMinutes = estimateRoadEtaMinutes(distanceKm);

    activeBooking.technicianLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: coords.address,
      heading: coords.heading,
      lastUpdated: new Date(),
    };
    activeBooking.estimatedEtaMinutes = estimatedEtaMinutes;
    await activeBooking.save();

    // Broadcast tracking event to customer
    const io = getSocketServer();
    if (io) {
      const payload = {
        bookingId: activeBooking._id.toString(),
        technicianId: tech._id.toString(),
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: coords.heading,
          address: coords.address,
        },
        distanceKm,
        estimatedEtaMinutes,
        timestamp: new Date().toISOString(),
      };

      io.to(`booking:${activeBooking._id.toString()}`).emit(SOCKET_EVENTS.TRACKING_LOCATION, payload);
      io.to('admin:dispatch').emit(SOCKET_EVENTS.TRACKING_LOCATION, payload);
    }

    return {
      activeBookingId: activeBooking._id,
      distanceKm,
      estimatedEtaMinutes,
      location: coords,
    };
  }

  static async getBookingTracking(bookingId: string) {
    const booking = await BookingModel.findById(bookingId).populate('technician');
    if (!booking) throw new Error('Booking not found');

    return {
      bookingId: booking._id,
      status: booking.status,
      customerLocation: {
        latitude: booking.pickupLocation.coordinates[1],
        longitude: booking.pickupLocation.coordinates[0],
        address: booking.pickupLocation.address,
      },
      technicianLocation: booking.technicianLocation,
      estimatedEtaMinutes: booking.estimatedEtaMinutes,
    };
  }
}
