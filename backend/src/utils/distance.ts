import { DISPATCH_CONFIG } from '@10min-help/shared';

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Estimates road travel ETA in minutes based on distance and average city speed.
 * Accounts for real road factors (approx 1.25x straight-line distance factor).
 */
export function estimateRoadEtaMinutes(
  distanceKm: number,
  averageSpeedKmh: number = DISPATCH_CONFIG.FALLBACK_AVERAGE_CITY_SPEED_KMH
): number {
  // Road distance is typically 1.25x to 1.35x crow-flies distance in Indian urban street grids
  const estimatedRoadDistance = distanceKm * 1.3;
  const transitHours = estimatedRoadDistance / averageSpeedKmh;
  const transitMinutes = Math.ceil(transitHours * 60);
  // Add a 2 minute buffer for dispatch coordination and parking/approaching
  return Math.max(3, transitMinutes + 2);
}
