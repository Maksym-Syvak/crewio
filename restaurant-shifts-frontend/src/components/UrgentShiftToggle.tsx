import { useEffect, useState } from 'react';
import type { Shift } from '@/types';
import { shiftsApi } from '@/api/shifts.api';
import { getErrorMessage } from '@/api/client';
import { isShiftUrgent } from '@/utils/shifts';

interface Props {
  shift: Shift;
  disabled?: boolean;
  onUpdated: (shift: Shift) => void;
  onError: (message: string) => void;
}

export function UrgentShiftToggle({ shift, disabled, onUpdated, onError }: Props) {
  const [checked, setChecked] = useState(Boolean(shift.is_manually_urgent));
  const [saving, setSaving] = useState(false);
  const autoUrgent = isShiftUrgent(shift) && !shift.is_manually_urgent;

  useEffect(() => {
    setChecked(Boolean(shift.is_manually_urgent));
  }, [shift.is_manually_urgent]);

  const toggle = async () => {
    const next = !checked;
    setSaving(true);
    try {
      const updated = await shiftsApi.setUrgent(shift.id, next);
      setChecked(Boolean(updated.is_manually_urgent));
      onUpdated(updated);
    } catch (e) {
      onError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <span className="text-[var(--tg-hint)]">Термінова зміна</span>
        {autoUrgent && (
          <p className="mt-0.5 text-xs text-[var(--crew-red)]">Автоматично позначено терміновою</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Термінова зміна"
        disabled={disabled || saving}
        className={`relative h-7 w-12 rounded-full transition disabled:opacity-40 ${
          checked ? 'bg-[var(--crew-red)]' : 'bg-[var(--crew-gray)]'
        }`}
        onClick={() => void toggle()}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
