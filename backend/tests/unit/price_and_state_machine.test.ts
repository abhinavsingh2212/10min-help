import {
  BookingStatus,
  INITIAL_SERVICE_CATALOGUE,
  ServiceCategory,
  VehicleType,
  isAllowedBookingTransition,
  validateBookingTransition,
} from '@10min-help/shared';

describe('Service Pricing Matrix & State Machine Unit Tests', () => {
  describe('Initial Service Catalogue Pricing Rules', () => {
    it('should have all 8 mandatory emergency services defined', () => {
      expect(INITIAL_SERVICE_CATALOGUE).toHaveLength(8);
      const categories = INITIAL_SERVICE_CATALOGUE.map((s) => s.category);
      expect(categories).toContain(ServiceCategory.PUNCTURE);
      expect(categories).toContain(ServiceCategory.BATTERY);
      expect(categories).toContain(ServiceCategory.NOT_STARTING);
      expect(categories).toContain(ServiceCategory.FUEL);
      expect(categories).toContain(ServiceCategory.LOCKOUT);
      expect(categories).toContain(ServiceCategory.MINOR_REPAIR);
      expect(categories).toContain(ServiceCategory.TYRE_CHANGE);
      expect(categories).toContain(ServiceCategory.TOWING);
    });

    it('should enforce correct starting prices from specification', () => {
      const puncture = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.PUNCTURE)!;
      expect(puncture.startingPrice[VehicleType.BIKE]).toBe(249);
      expect(puncture.startingPrice[VehicleType.CAR]).toBe(349);

      const battery = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.BATTERY)!;
      expect(battery.startingPrice[VehicleType.BIKE]).toBe(299);
      expect(battery.startingPrice[VehicleType.CAR]).toBe(499);

      const towing = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.TOWING)!;
      expect(towing.startingPrice[VehicleType.BIKE]).toBe(799);
      expect(towing.startingPrice[VehicleType.CAR]).toBe(1499);

      const fuel = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.FUEL)!;
      expect(fuel.startingPrice[VehicleType.BIKE]).toBe(199);
      expect(fuel.startingPrice[VehicleType.CAR]).toBe(299);

      const lockout = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.LOCKOUT)!;
      expect(lockout.startingPrice[VehicleType.BIKE]).toBe(399);
      expect(lockout.startingPrice[VehicleType.CAR]).toBe(599);

      const minorRepair = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.MINOR_REPAIR)!;
      expect(minorRepair.startingPrice[VehicleType.BIKE]).toBe(349);
      expect(minorRepair.startingPrice[VehicleType.CAR]).toBe(549);

      const notStarting = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.NOT_STARTING)!;
      expect(notStarting.startingPrice[VehicleType.BIKE]).toBe(199);
      expect(notStarting.startingPrice[VehicleType.CAR]).toBe(349);

      const tyreChange = INITIAL_SERVICE_CATALOGUE.find((s) => s.category === ServiceCategory.TYRE_CHANGE)!;
      expect(tyreChange.startingPrice[VehicleType.BIKE]).toBe(399);
      expect(tyreChange.startingPrice[VehicleType.CAR]).toBe(699);
    });
  });

  describe('Canonical Booking State Machine Transitions', () => {
    it('should allow valid happy-path lifecycle transitions', () => {
      expect(isAllowedBookingTransition(BookingStatus.REQUESTED, BookingStatus.SEARCHING)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.SEARCHING, BookingStatus.ASSIGNED)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.EN_ROUTE, BookingStatus.ARRIVED)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.ARRIVED, BookingStatus.INSPECTING)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.INSPECTING, BookingStatus.IN_PROGRESS)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED)).toBe(true);
    });

    it('should allow quote revision workflow during inspection', () => {
      expect(isAllowedBookingTransition(BookingStatus.INSPECTING, BookingStatus.AWAITING_CUSTOMER_APPROVAL)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.AWAITING_CUSTOMER_APPROVAL, BookingStatus.IN_PROGRESS)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.AWAITING_CUSTOMER_APPROVAL, BookingStatus.CANCELLED)).toBe(true);
    });

    it('should reject invalid and illegal backwards state transitions', () => {
      // Cannot skip directly from REQUESTED to COMPLETED
      const invalidSkip = validateBookingTransition(BookingStatus.REQUESTED, BookingStatus.COMPLETED);
      expect(invalidSkip.valid).toBe(false);

      // Cannot go backwards from COMPLETED
      const invalidBackwards = validateBookingTransition(BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS);
      expect(invalidBackwards.valid).toBe(false);
      expect(invalidBackwards.reason).toContain('terminal status');

      // Cannot transition from CANCELLED
      const cancelledRetry = validateBookingTransition(BookingStatus.CANCELLED, BookingStatus.SEARCHING);
      expect(cancelledRetry.valid).toBe(false);
    });

    it('should allow cancellation from early stages', () => {
      expect(isAllowedBookingTransition(BookingStatus.REQUESTED, BookingStatus.CANCELLED)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.SEARCHING, BookingStatus.CANCELLED)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.ASSIGNED, BookingStatus.CANCELLED)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.EN_ROUTE, BookingStatus.CANCELLED)).toBe(true);
    });

    it('should allow transition to UNFULFILLED when no mechanics are found', () => {
      expect(isAllowedBookingTransition(BookingStatus.SEARCHING, BookingStatus.UNFULFILLED)).toBe(true);
      expect(isAllowedBookingTransition(BookingStatus.UNFULFILLED, BookingStatus.SEARCHING)).toBe(true);
    });
  });
});
