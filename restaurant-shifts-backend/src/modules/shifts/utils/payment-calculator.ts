import { PaymentType, Shift } from '../entities/shift.entity';
import { BookingType, ShiftBooking } from '../entities/shift-booking.entity';

/** Extension point for night coefficients, overtime, holidays, bonuses, penalties */
export interface PayModifiers {
  nightCoefficient?: number;
  overtimeMultiplier?: number;
  holidayMultiplier?: number;
  bonus?: number;
  penalty?: number;
}

export function getBookingStart(booking: ShiftBooking, shift: Shift): Date {
  if (booking.booking_type === BookingType.PARTIAL && booking.booked_start_time) {
    return booking.booked_start_time;
  }
  return shift.start_time;
}

export function getBookingEnd(booking: ShiftBooking, shift: Shift): Date {
  if (booking.booking_type === BookingType.PARTIAL && booking.booked_end_time) {
    return booking.booked_end_time;
  }
  return shift.end_time;
}

export function getBookingHours(booking: ShiftBooking, shift: Shift): number {
  const start = getBookingStart(booking, shift);
  const end = getBookingEnd(booking, shift);
  return (end.getTime() - start.getTime()) / 3_600_000;
}

export function getPlannedHours(shift: Pick<Shift, 'start_time' | 'end_time'>): number {
  return (shift.end_time.getTime() - shift.start_time.getTime()) / 3_600_000;
}

function applyModifiers(base: number, modifiers?: PayModifiers): number {
  let total = base;
  if (modifiers?.nightCoefficient && modifiers.nightCoefficient !== 1) {
    total *= modifiers.nightCoefficient;
  }
  if (modifiers?.overtimeMultiplier && modifiers.overtimeMultiplier !== 1) {
    total *= modifiers.overtimeMultiplier;
  }
  if (modifiers?.holidayMultiplier && modifiers.holidayMultiplier !== 1) {
    total *= modifiers.holidayMultiplier;
  }
  if (modifiers?.bonus) total += modifiers.bonus;
  if (modifiers?.penalty) total -= modifiers.penalty;
  return Math.max(0, Math.round(total * 100) / 100);
}

export function calculateBookingSalary(
  shift: Pick<
    Shift,
    'payment_type' | 'shift_rate' | 'hourly_rate' | 'fixed_rate' | 'payment_rate' | 'start_time' | 'end_time'
  >,
  booking: ShiftBooking,
  modifiers?: PayModifiers,
): number {
  const hours = getBookingHours(booking, shift as Shift);
  let base = 0;

  switch (shift.payment_type) {
    case PaymentType.HOURLY:
      base = hours * Number(shift.hourly_rate ?? 0);
      break;
    case PaymentType.FIXED:
      base = Number(shift.fixed_rate ?? 0);
      break;
    case PaymentType.SHIFT:
    default:
      base = Number(shift.shift_rate ?? shift.payment_rate ?? 0);
      break;
  }

  return applyModifiers(base, modifiers);
}

/** @deprecated use calculateBookingSalary */
export function calculatePlannedSalary(
  shift: Pick<
    Shift,
    'payment_type' | 'shift_rate' | 'hourly_rate' | 'fixed_rate' | 'payment_rate' | 'start_time' | 'end_time'
  >,
  modifiers?: PayModifiers,
): number {
  const hours = getPlannedHours(shift);
  let base = 0;
  switch (shift.payment_type) {
    case PaymentType.HOURLY:
      base = hours * Number(shift.hourly_rate ?? 0);
      break;
    case PaymentType.FIXED:
      base = Number(shift.fixed_rate ?? 0);
      break;
    default:
      base = Number(shift.shift_rate ?? shift.payment_rate ?? 0);
  }
  return applyModifiers(base, modifiers);
}

/** @deprecated use calculateBookingSalary */
export function calculateActualSalary(
  shift: Pick<
    Shift,
    'payment_type' | 'shift_rate' | 'hourly_rate' | 'fixed_rate' | 'payment_rate' | 'start_time' | 'end_time'
  >,
  booking?: ShiftBooking,
  modifiers?: PayModifiers,
): number {
  if (booking) return calculateBookingSalary(shift, booking, modifiers);
  return calculatePlannedSalary(shift, modifiers);
}
