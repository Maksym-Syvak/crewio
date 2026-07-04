import type { Shift, ShiftBooking } from '@/types';

export function getShiftBookings(shift: Shift): ShiftBooking[] {
  return shift.bookings ?? shift.assignments ?? [];
}

export function getBookedCount(shift: Shift): number {
  if (typeof shift.booked_employees === 'number') {
    return shift.booked_employees;
  }
  return getShiftBookings(shift).filter((b) => b.status !== 'cancelled').length;
}

export function getAvailableSlots(shift: Shift): number {
  return Math.max(0, shift.required_employees - getBookedCount(shift));
}

export function isShiftFull(shift: Shift): boolean {
  return getAvailableSlots(shift) === 0;
}

export function isEmployeeBooked(shift: Shift, employeeId?: string): boolean {
  if (!employeeId) return false;
  return getShiftBookings(shift).some(
    (b) => b.employee_id === employeeId && b.status !== 'cancelled',
  );
}

export function getShiftPayLabel(shift: Shift): string | null {
  if (shift.payment_rate != null) return `${shift.payment_rate} ₴`;
  return null;
}
