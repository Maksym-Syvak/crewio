import { useEffect, useState } from 'react';
import type { Shift } from '@/types';
import { shiftsApi } from '@/api/shifts.api';
import { getErrorMessage } from '@/api/client';
import { getBookedCount } from '@/utils/shifts';

interface Props {
  shift: Shift;
  onUpdated: (shift: Shift) => void;
  onError: (message: string) => void;
}

const MIN_REQUIRED = 1;
const MAX_REQUIRED = 99;

export function RequiredEmployeesEditor({ shift, onUpdated, onError }: Props) {
  const [value, setValue] = useState(shift.required_employees);
  const [saving, setSaving] = useState(false);
  const booked = getBookedCount(shift);
  const minAllowed = Math.max(MIN_REQUIRED, booked);

  useEffect(() => {
    setValue(shift.required_employees);
  }, [shift.required_employees]);

  const apply = async (next: number) => {
    if (next < minAllowed) {
      onError(
        'Неможливо встановити кількість працівників меншу за кількість вже заброньованих.',
      );
      return;
    }
    if (next > MAX_REQUIRED || next === value) return;

    setSaving(true);
    try {
      const updated = await shiftsApi.update(shift.id, { required_employees: next });
      setValue(updated.required_employees);
      onUpdated(updated);
    } catch (e) {
      onError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--tg-hint)]">Необхідно працівників</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tg-secondary-bg)] text-lg font-semibold disabled:opacity-40"
          disabled={saving || value <= minAllowed}
          aria-label="Зменшити"
          onClick={() => void apply(value - 1)}
        >
          −
        </button>
        <span className="min-w-[2ch] text-center font-semibold">{value}</span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tg-secondary-bg)] text-lg font-semibold disabled:opacity-40"
          disabled={saving || value >= MAX_REQUIRED}
          aria-label="Збільшити"
          onClick={() => void apply(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
