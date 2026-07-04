import type { Shift } from '../entities/shift.entity';
import { ShiftBookingStatus } from '../entities/shift-booking.entity';

export function getShiftBookings(shift: Shift) {
  return shift.bookings ?? [];
}

export function getBookedCount(shift: Shift): number {
  if (typeof shift.booked_employees === 'number') {
    return shift.booked_employees;
  }
  return getShiftBookings(shift).filter((b) => b.status !== ShiftBookingStatus.CANCELLED)
    .length;
}

export function getAvailableSlots(shift: Shift): number {
  return Math.max(0, shift.required_employees - getBookedCount(shift));
}
