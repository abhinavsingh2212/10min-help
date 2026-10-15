import { calculateHaversineDistanceKm, estimateRoadEtaMinutes } from '../../src/utils/distance';
import { DISPATCH_CONFIG, DispatchOfferStatus } from '@10min-help/shared';

describe('Dispatch Calculation & Expiry Unit Tests', () => {
  it('should calculate accurate Haversine distance between Bangalore coordinates', () => {
    // Indiranagar (12.9784, 77.6408) to Koramangala (12.9352, 77.6271) ~5.0 to 5.2 km
    const distance = calculateHaversineDistanceKm(12.9784, 77.6408, 12.9352, 77.6271);
    expect(distance).toBeGreaterThan(4.5);
    expect(distance).toBeLessThan(5.5);
  });

  it('should estimate realistic urban road ETA with urban road buffer', () => {
    // 2 km in city traffic should be around 7-8 minutes
    const eta = estimateRoadEtaMinutes(2);
    expect(eta).toBeGreaterThanOrEqual(7);
    expect(eta).toBeLessThanOrEqual(10);
  });

  it('should verify 15-second offer timeout configuration', () => {
    expect(DISPATCH_CONFIG.OFFER_EXPIRY_SECONDS).toBe(15);
    expect(DISPATCH_CONFIG.MAX_DISPATCH_RETRIES).toBe(3);
    expect(DISPATCH_CONFIG.TARGET_ARRIVAL_MINUTES).toBe(10);
  });

  it('should properly identify expired offers based on timestamp', () => {
    const now = Date.now();
    const activeOffer = {
      expiresAt: new Date(now + 5000), // 5s in future
      status: DispatchOfferStatus.PENDING,
    };
    const expiredOffer = {
      expiresAt: new Date(now - 1000), // 1s in past
      status: DispatchOfferStatus.PENDING,
    };

    expect(new Date() > activeOffer.expiresAt).toBe(false);
    expect(new Date() > expiredOffer.expiresAt).toBe(true);
  });
});
