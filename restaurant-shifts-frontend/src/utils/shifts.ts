import type { PaymentType, Shift, ShiftBooking, ShiftStatus } from '@/types';
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

export function getBookingTimeRange(booking: ShiftBooking, shift: Shift): { start: string; end: string } {
  if (booking.booking_type === 'partial' && booking.booked_start_time && booking.booked_end_time) {
    return { start: booking.booked_start_time, end: booking.booked_end_time };
  }
  return { start: shift.start_time, end: shift.end_time };
}

export function getBookingHours(booking: ShiftBooking, shift: Shift): number {
  const { start, end } = getBookingTimeRange(booking, shift);
  return shiftDurationHours(start, end);
}

export function getPlannedHours(shift: Shift): number {
  return shiftDurationHours(shift.start_time, shift.end_time);
}

export function isPartialBooking(booking: ShiftBooking): boolean {
  return booking.booking_type === 'partial';
}

export function getEmployeeBooking(
  shift: Shift,
  employeeId?: string,
): ShiftBooking | undefined {
  if (!employeeId) return undefined;
  return getShiftBookings(shift).find(
    (b) => b.employee_id === employeeId && b.status !== 'cancelled',
  );
}

export function hasStaffBookings(shift: Shift): boolean {
  return getBookedCount(shift) > 0;
}

export function shiftHasPartialBookings(shift: Shift): boolean {
  return getShiftBookings(shift).some(
    (b) => b.status !== 'cancelled' && isPartialBooking(b),
  );
}

export type ShiftDisplayVariant = 'mine' | 'minePartial' | 'available' | 'urgent' | 'dayoff';

export function getShiftDisplayVariant(
  shift: Shift,
  options: { isAdmin: boolean; employeeId?: string },
): ShiftDisplayVariant {
  const { isAdmin, employeeId } = options;

  if (!isAdmin) {
    const myBooking = getEmployeeBooking(shift, employeeId);
    if (myBooking) {
      return isPartialBooking(myBooking) ? 'minePartial' : 'mine';
    }
  } else if (hasStaffBookings(shift)) {
    return shiftHasPartialBookings(shift) ? 'minePartial' : 'mine';
  }

  if (isShiftUrgent(shift)) return 'urgent';
  if (getAvailableSlots(shift) === 0) return 'dayoff';
  return 'available';
}

export function getShiftBookingBadgeLabel(
  shift: Shift,
  options: { isAdmin: boolean; employeeId?: string },
): string | null {
  const { isAdmin, employeeId } = options;

  if (!isAdmin) {
    if (!isEmployeeBooked(shift, employeeId)) return null;
    const booking = getEmployeeBooking(shift, employeeId);
    if (booking && isPartialBooking(booking)) return 'Моя зміна (часткова)';
    return 'Моя зміна';
  }

  if (!hasStaffBookings(shift)) return null;
  return shiftHasPartialBookings(shift) ? 'Частково заброньована' : 'Заброньована';
}

export function getBookingLegendLabels(isAdmin: boolean) {
  if (isAdmin) {
    return {
      full: 'Заброньована',
      partial: 'Частково заброньована',
    };
  }
  return {
    full: 'Моя зміна (повна)',
    partial: 'Моя зміна (часткова)',
  };
}

/** Left accent border — full matches "Моя зміна", partial uses amber */
export const BOOKING_ACCENT = {
  full: 'border-l-4 border-l-[var(--crew-green)]',
  partial: 'border-l-4 border-l-[var(--crew-amber)]',
} as const;

export const BOOKING_DOT = {
  full: 'bg-[var(--crew-green)]',
  partial: 'bg-[var(--crew-amber)]',
} as const;

export function getBookingAccent(partial: boolean): string {
  return partial ? BOOKING_ACCENT.partial : BOOKING_ACCENT.full;
}

export function getBookingDot(partial: boolean): string {
  return partial ? BOOKING_DOT.partial : BOOKING_DOT.full;
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

export function calculateBookingPayPreview(shift: Shift, booking: ShiftBooking): string | null {
  if (booking.actual_salary != null) return `${booking.actual_salary} ₴`;

  const hours = getBookingHours(booking, shift);
  if (shift.payment_type === 'hourly' && shift.hourly_rate != null) {
    const total = Math.round(Number(shift.hourly_rate) * hours * 100) / 100;
    return `${total} ₴ (${hours.toFixed(1)} год × ${shift.hourly_rate} ₴)`;
  }

  const rate = shift.shift_rate ?? shift.fixed_rate ?? shift.payment_rate;
  return rate != null ? `${rate} ₴` : null;
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  shift: 'За зміну',
  hourly: 'Погодинна',
  fixed: 'Фіксована ставка',
};

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  open: 'Відкрита',
  partially_filled: 'Частково заповнена',
  fully_filled: 'Заповнена',
  urgent: 'Терміново',
  active: 'Активна',
  completed: 'Завершена',
  cancelled: 'Скасована',
};

export function getShiftStatusLabel(status: ShiftStatus): string {
  return SHIFT_STATUS_LABELS[status] ?? status;
}

export function isShiftUrgent(shift: Shift): boolean {
  return shift.status === 'urgent' || shift.is_urgent;
}

export function canBookShift(shift: Shift): boolean {
  return !['active', 'completed', 'cancelled'].includes(shift.status);
}
