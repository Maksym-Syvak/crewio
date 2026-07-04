import { useState } from 'react';
import type { Shift } from '@/types';
import { formatDate, formatTime } from '@/utils/dates';
import { useAuthStore, useShiftsStore, useToastStore } from '@/store';
import {
  canBookShift,
  getShiftPayLabel,
  isEmployeeBooked,
  isShiftFull,
  isShiftUrgent,
} from '@/utils/shifts';
import { isAdminRole } from '@/utils/roles';
import {
  ShiftBookingForm,
  ShiftBookingStatus,
  ShiftSlotsInfo,
} from '@/components/ShiftBookingForm';
import { cn } from '@/utils/cn';

interface Props {
  shift: Shift;
  onClose: () => void;
  onUpdated?: (shift: Shift) => void;
}

export function ShiftModal({ shift: initialShift, onClose, onUpdated }: Props) {
  const [shift, setShift] = useState(initialShift);
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const upsertShift = useShiftsStore((s) => s.upsertShift);
  const push = useToastStore((s) => s.push);

  const isAdmin = Boolean(user && isAdminRole(user.role));

  const pay = getShiftPayLabel(shift);
  const isBooked = isEmployeeBooked(shift, employee?.id);
  const full = isShiftFull(shift);
  const bookable = canBookShift(shift) && !isBooked && !full && Boolean(employee);

  const handleBooked = (updated: Shift) => {
    setShift(updated);
    upsertShift(updated);
    onUpdated?.(updated);
    push({ type: 'success', title: 'Зміну заброньовано' });
  };

  const handleShiftUpdated = (updated: Shift) => {
    setShift(updated);
    upsertShift(updated);
    onUpdated?.(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--tg-bg)] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--tg-hint)]/40" />

        {isShiftUrgent(shift) && (
          <div className="mb-3 rounded-xl bg-[var(--crew-red)] px-4 py-2 text-center text-sm font-semibold text-white">
            🚨 ТЕРМІНОВО
          </div>
        )}

        <h2 className="text-lg font-bold">{shift.shift_type || 'Зміна'}</h2>
        <p className="text-sm text-[var(--tg-hint)]">{shift.restaurant?.name}</p>

        <dl className="card mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--tg-hint)]">Дата</dt>
            <dd>{formatDate(shift.start_time)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--tg-hint)]">Час</dt>
            <dd>
              {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
            </dd>
          </div>
          {pay && (
            <div className="flex justify-between">
              <dt className="text-[var(--tg-hint)]">Ставка</dt>
              <dd>{pay}</dd>
            </div>
          )}
          <ShiftSlotsInfo
            shift={shift}
            editable={isAdmin}
            showBookingBreakdown={isAdmin}
            onUpdated={handleShiftUpdated}
            onError={(msg) => push({ type: 'error', title: msg })}
          />
        </dl>

        <div className="mt-4 space-y-3">
          <ShiftBookingStatus shift={shift} employeeId={employee?.id} isAdmin={isAdmin} />

          {bookable && employee && (
            <div className="card">
              <ShiftBookingForm
                shift={shift}
                employeeId={employee.id}
                onBooked={handleBooked}
                onError={(msg) => push({ type: 'error', title: msg })}
              />
            </div>
          )}

          {!employee && !isBooked && !full && (
            <p className={cn('text-center text-sm text-[var(--tg-hint)]')}>
              Увійдіть як працівник, щоб забронювати зміну
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
