import { BookingStatus } from '../enums';

export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.REQUESTED]: [
    BookingStatus.SEARCHING,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.SEARCHING]: [
    BookingStatus.ASSIGNED,
    BookingStatus.UNFULFILLED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ASSIGNED]: [
    BookingStatus.EN_ROUTE,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.EN_ROUTE]: [
    BookingStatus.ARRIVED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ARRIVED]: [
    BookingStatus.INSPECTING,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.INSPECTING]: [
    BookingStatus.AWAITING_CUSTOMER_APPROVAL,
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.AWAITING_CUSTOMER_APPROVAL]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.IN_PROGRESS]: [
    BookingStatus.COMPLETED,
  ],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.UNFULFILLED]: [
    BookingStatus.SEARCHING, // Allows manual or retry re-dispatch
  ],
};

export function isAllowedBookingTransition(from: BookingStatus, to: BookingStatus): boolean {
  const allowed = ALLOWED_BOOKING_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function validateBookingTransition(from: BookingStatus, to: BookingStatus): { valid: boolean; reason?: string } {
  if (from === to) {
    return { valid: false, reason: `Booking is already in status '${from}'` };
  }

  if (from === BookingStatus.COMPLETED || from === BookingStatus.CANCELLED) {
    return { valid: false, reason: `Cannot transition from terminal status '${from}'` };
  }

  if (!isAllowedBookingTransition(from, to)) {
    return {
      valid: false,
      reason: `Invalid booking transition from '${from}' to '${to}'. Allowed targets: [${ALLOWED_BOOKING_TRANSITIONS[from]?.join(', ') || 'None'}]`,
    };
  }

  return { valid: true };
}
