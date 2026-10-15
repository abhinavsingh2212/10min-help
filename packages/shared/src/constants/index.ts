import { ServiceCategory, VehicleType } from '../enums';

export interface DefaultServiceDefinition {
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
}

export const INITIAL_SERVICE_CATALOGUE: DefaultServiceDefinition[] = [
  {
    category: ServiceCategory.PUNCTURE,
    name: 'Puncture Repair',
    description: 'On-spot tubeless puncture sealing or tube patch by verified technician with specialized kit.',
    inclusions: ['Up to 2 punctures fixed', 'Tyre air pressure check', 'Safety valve inspection'],
    startingPrice: {
      [VehicleType.BIKE]: 249,
      [VehicleType.CAR]: 349,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 15,
  },
  {
    category: ServiceCategory.BATTERY,
    name: 'Battery Jump Start',
    description: 'Emergency booster jump start with heavy-duty cables and voltage diagnostic tester.',
    inclusions: ['Heavy-duty jump start', 'Alternator charging health check', 'Terminal cleaning'],
    startingPrice: {
      [VehicleType.BIKE]: 299,
      [VehicleType.CAR]: 499,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 12,
  },
  {
    category: ServiceCategory.NOT_STARTING,
    name: 'Vehicle Not Starting / Inspection',
    description: 'Comprehensive initial diagnosis for ignition, spark plug, fuse, and starter motor issues.',
    inclusions: ['Spark plug & ignition inspection', 'Fuel line check', 'Fuse box diagnostic', 'Minor fix'],
    startingPrice: {
      [VehicleType.BIKE]: 199,
      [VehicleType.CAR]: 349,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 25,
  },
  {
    category: ServiceCategory.FUEL,
    name: 'Fuel Delivery',
    description: 'Emergency delivery of 2 to 5 litres of petrol or diesel in approved safety canisters.',
    inclusions: ['Emergency fuel transport', 'Safe funneled fueling', 'Air lock clearance if required'],
    startingPrice: {
      [VehicleType.BIKE]: 199,
      [VehicleType.CAR]: 299,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 10,
  },
  {
    category: ServiceCategory.LOCKOUT,
    name: 'Key Lockout Assistance',
    description: 'Non-destructive vehicle entry assistance using specialized automotive lockout tools.',
    inclusions: ['Non-destructive unlocking', 'Lock & latch safety check', 'Zero-damage guarantee'],
    startingPrice: {
      [VehicleType.BIKE]: 399,
      [VehicleType.CAR]: 599,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 20,
  },
  {
    category: ServiceCategory.MINOR_REPAIR,
    name: 'Minor On-Road Mechanical Repair',
    description: 'Quick roadside adjustments for clutch wire, throttle cable, brake fluid, belts, and chain tightening.',
    inclusions: ['Cable adjustments', 'Chain lubrication/tightening', 'Fluid top-up assistance', 'Nut/bolt tightening'],
    startingPrice: {
      [VehicleType.BIKE]: 349,
      [VehicleType.CAR]: 549,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 20,
  },
  {
    category: ServiceCategory.TYRE_CHANGE,
    name: 'Tyre Change / EV Emergency Support',
    description: 'Safe replacement of flat tyre using customer spare wheel or emergency EV assistance.',
    inclusions: ['Hydraulic jack lifting', 'Damaged wheel removal', 'Stepney fitting and torque tightening', 'Air pressure check'],
    startingPrice: {
      [VehicleType.BIKE]: 399,
      [VehicleType.CAR]: 699,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 15,
  },
  {
    category: ServiceCategory.TOWING,
    name: 'Long-Distance Towing',
    description: 'Safe flatbed or hydraulic lift towing to nearest authorized service station or garage.',
    inclusions: ['Flatbed / wheel-lift towing', 'Secure wheel strapping', 'First 5 km towing included'],
    startingPrice: {
      [VehicleType.BIKE]: 799,
      [VehicleType.CAR]: 1499,
    },
    supportedVehicles: [VehicleType.BIKE, VehicleType.CAR],
    estimatedDurationMinutes: 45,
  },
];

export const SOCKET_EVENTS = {
  BOOKING_CREATED: 'booking:created',
  BOOKING_SEARCHING: 'booking:searching',
  BOOKING_OFFER: 'booking:offer',
  BOOKING_ASSIGNED: 'booking:assigned',
  BOOKING_STATUS: 'booking:status',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_QUOTE_UPDATED: 'booking:quote-updated',
  TRACKING_LOCATION: 'tracking:location',
  PAYMENT_UPDATED: 'payment:updated',
  NOTIFICATION_NEW: 'notification:new',
} as const;

export const DISPATCH_CONFIG = {
  OFFER_EXPIRY_SECONDS: 15,
  TARGET_ARRIVAL_MINUTES: 10,
  DEFAULT_SEARCH_RADIUS_KM: 10,
  MAX_DISPATCH_RETRIES: 3,
  FALLBACK_AVERAGE_CITY_SPEED_KMH: 25,
} as const;
