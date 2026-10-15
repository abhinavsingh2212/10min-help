import { DispatchService } from '../../src/modules/dispatch/dispatch.service';
import { DispatchOfferModel } from '../../src/models/DispatchOffer';
import { TechnicianModel } from '../../src/models/Technician';
import { BookingModel } from '../../src/models/Booking';
import { DispatchOfferStatus, TechnicianVerificationStatus, BookingStatus } from '@10min-help/shared';
import mongoose from 'mongoose';

describe('Dispatch Concurrency & Race-Safety Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should prevent two technicians from simultaneously claiming the same dispatch offer', async () => {
    const offerId = new mongoose.Types.ObjectId().toString();
    const techUserA = new mongoose.Types.ObjectId().toString();
    const techUserB = new mongoose.Types.ObjectId().toString();
    const techDocIdA = new mongoose.Types.ObjectId();
    const techDocIdB = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();

    // Mock TechnicianModel.findOne
    jest.spyOn(TechnicianModel, 'findOne').mockImplementation((query: any) => {
      if (query.user === techUserA) {
        return {
          populate: jest.fn().mockResolvedValue({
            _id: techDocIdA,
            user: { _id: techUserA, name: 'Technician A' },
            verificationStatus: TechnicianVerificationStatus.VERIFIED,
          }),
        } as any;
      }
      return {
        populate: jest.fn().mockResolvedValue({
          _id: techDocIdB,
          user: { _id: techUserB, name: 'Technician B' },
          verificationStatus: TechnicianVerificationStatus.VERIFIED,
        }),
      } as any;
    });

    // Mock DispatchOfferModel.findById
    jest.spyOn(DispatchOfferModel, 'findById').mockResolvedValue({
      _id: offerId,
      technician: techDocIdA, // Assigned to Tech A
      booking: bookingId,
      status: DispatchOfferStatus.PENDING,
      expiresAt: new Date(Date.now() + 10000),
    } as any);

    // Tech B tries to accept Tech A's offer -> forbidden
    await expect(DispatchService.acceptOffer(offerId, techUserB)).rejects.toThrow(
      'This offer was not assigned to you'
    );
  });

  it('should reject offer acceptance if offer has already expired or been claimed', async () => {
    const offerId = new mongoose.Types.ObjectId().toString();
    const techUserId = new mongoose.Types.ObjectId().toString();
    const techDocId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();

    jest.spyOn(TechnicianModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: techDocId,
        user: { _id: techUserId, name: 'Tech One' },
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
      }),
    } as any);

    // Offer status is already ACCEPTED (claimed earlier by someone or duplicate click)
    jest.spyOn(DispatchOfferModel, 'findById').mockResolvedValue({
      _id: offerId,
      technician: techDocId,
      booking: bookingId,
      status: DispatchOfferStatus.ACCEPTED,
      expiresAt: new Date(Date.now() + 10000),
    } as any);

    await expect(DispatchService.acceptOffer(offerId, techUserId)).rejects.toThrow(
      'Offer is no longer active'
    );
  });

  it('should prevent a technician from accepting a booking if they already have an active job', async () => {
    const offerId = new mongoose.Types.ObjectId().toString();
    const techUserId = new mongoose.Types.ObjectId().toString();
    const techDocId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();

    jest.spyOn(TechnicianModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: techDocId,
        user: { _id: techUserId, name: 'Busy Tech' },
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
      }),
    } as any);

    jest.spyOn(DispatchOfferModel, 'findById').mockResolvedValue({
      _id: offerId,
      technician: techDocId,
      booking: bookingId,
      status: DispatchOfferStatus.PENDING,
      expiresAt: new Date(Date.now() + 10000),
    } as any);

    // Offer claim succeeds
    jest.spyOn(DispatchOfferModel, 'findOneAndUpdate').mockResolvedValue({
      _id: offerId,
      status: DispatchOfferStatus.ACCEPTED,
    } as any);

    // But TechnicianModel.findOneAndUpdate fails because technician is already active on another job
    jest.spyOn(TechnicianModel, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(DispatchOfferModel, 'findByIdAndUpdate').mockResolvedValue({} as any);

    await expect(DispatchService.acceptOffer(offerId, techUserId)).rejects.toThrow(
      'You already have an active job or are offline'
    );
  });

  it('should safely roll back technician reservation if booking was already taken concurrently', async () => {
    const offerId = new mongoose.Types.ObjectId().toString();
    const techUserId = new mongoose.Types.ObjectId().toString();
    const techDocId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();

    jest.spyOn(TechnicianModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: techDocId,
        user: { _id: techUserId, name: 'Tech Racer' },
        verificationStatus: TechnicianVerificationStatus.VERIFIED,
      }),
    } as any);

    jest.spyOn(DispatchOfferModel, 'findById').mockResolvedValue({
      _id: offerId,
      technician: techDocId,
      booking: bookingId,
      status: DispatchOfferStatus.PENDING,
      expiresAt: new Date(Date.now() + 10000),
    } as any);

    jest.spyOn(DispatchOfferModel, 'findOneAndUpdate').mockResolvedValue({
      _id: offerId,
      booking: bookingId,
      status: DispatchOfferStatus.ACCEPTED,
    } as any);

    // Technician claimed successfully
    jest.spyOn(TechnicianModel, 'findOneAndUpdate').mockResolvedValue({
      _id: techDocId,
      activeBookingId: bookingId,
    } as any);

    // But booking is no longer in SEARCHING status (e.g. cancelled or assigned by dispatcher concurrently)
    const bookingFindOneAndUpdateSpy = jest.spyOn(BookingModel, 'findOneAndUpdate').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    } as any);

    const techRollbackSpy = jest.spyOn(TechnicianModel, 'findByIdAndUpdate').mockResolvedValue({} as any);
    const offerRollbackSpy = jest.spyOn(DispatchOfferModel, 'findByIdAndUpdate').mockResolvedValue({} as any);

    await expect(DispatchService.acceptOffer(offerId, techUserId)).rejects.toThrow(
      'Booking is no longer available or was claimed by another technician.'
    );

    // Verify clean rollback of technician active booking reservation
    expect(techRollbackSpy).toHaveBeenCalledWith(techDocId, {
      $unset: { activeBookingId: 1 },
    });
    // Verify offer rolled back to expired
    expect(offerRollbackSpy).toHaveBeenCalled();
  });
});
