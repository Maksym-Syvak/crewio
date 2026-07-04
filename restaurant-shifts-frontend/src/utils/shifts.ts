import type { PaymentType, Shift, ShiftBooking } from '@/types';
import { shiftDurationHours } from '@/utils/dates';

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

export function getPlannedHours(shift: Shift): number {
  return shiftDurationHours(shift.start_time, shift.end_time);
}

export function getActualHours(shift: Shift): number {
  if (shift.actual_start_time && shift.actual_end_time) {
    return shiftDurationHours(shift.actual_start_time, shift.actual_end_time);
  }
  return getPlannedHours(shift);
}

export function getShiftPayLabel(shift: Shift): string | null {
  const type = shift.payment_type ?? (shift.payment_rate != null ? 'shift' : null);
  if (!type) return null;

  switch (type) {
    case 'hourly':
      return shift.hourly_rate != null ? `${shift.hourly_rate} ₴/год` : null;
    case 'fixed':
      return shift.fixed_rate != null ? `${shift.fixed_rate} ₴ (фікс.)` : null;
    case 'shift':
    default:
      return (
        shift.shift_rate != null
          ? `${shift.shift_rate} ₴/зміну`
          : shift.payment_rate != null
            ? `${shift.payment_rate} ₴/зміну`
            : null
      );
  }
}

export function calculateShiftPayPreview(shift: Shift): string | null {
  const label = getShiftPayLabel(shift);
  if (!label) return null;

  if (shift.payment_type === 'hourly' && shift.hourly_rate != null) {
    const hours = getActualHours(shift);
    const total = Math.round(Number(shift.hourly_rate) * hours * 100) / 100;
    return `${total} ₴ (${hours.toFixed(1)} год × ${shift.hourly_rate} ₴)`;
  }

  const rate = shift.shift_rate ?? shift.fixed_rate ?? shift.payment_rate;
  return rate != null ? `${rate} ₴` : label;
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  shift: 'За зміну',
  hourly: 'Погодинна',
  fixed: 'Фіксована ставка',
};
