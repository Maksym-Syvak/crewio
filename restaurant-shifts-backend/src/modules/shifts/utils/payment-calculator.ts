import { PaymentType, Shift } from '../entities/shift.entity';

/** Extension point for night coefficients, overtime, holidays, bonuses, penalties */
export interface PayModifiers {
  nightCoefficient?: number;
  overtimeMultiplier?: number;
  holidayMultiplier?: number;
  bonus?: number;
  penalty?: number;
}

export function getPlannedHours(shift: Pick<Shift, 'start_time' | 'end_time'>): number {
  return (shift.end_time.getTime() - shift.start_time.getTime()) / 3_600_000;
}

export function getActualHours(
  shift: Pick<Shift, 'start_time' | 'end_time' | 'actual_start_time' | 'actual_end_time'>,
): number {
  if (shift.actual_start_time && shift.actual_end_time) {
    return (
      (shift.actual_end_time.getTime() - shift.actual_start_time.getTime()) / 3_600_000
    );
  }
  return getPlannedHours(shift);
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
    case PaymentType.SHIFT:
    default:
      base = Number(shift.shift_rate ?? shift.payment_rate ?? 0);
      break;
  }

  return applyModifiers(base, modifiers);
}

export function calculateActualSalary(
  shift: Pick<
    Shift,
    | 'payment_type'
    | 'shift_rate'
    | 'hourly_rate'
    | 'fixed_rate'
    | 'payment_rate'
    | 'start_time'
    | 'end_time'
    | 'actual_start_time'
    | 'actual_end_time'
  >,
  modifiers?: PayModifiers,
): number {
  if (shift.payment_type === PaymentType.HOURLY) {
    const hours = getActualHours(shift);
    return applyModifiers(hours * Number(shift.hourly_rate ?? 0), modifiers);
  }
  return calculatePlannedSalary(shift, modifiers);
}
