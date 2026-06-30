import type { Shift } from '@/types';
import { formatDate, formatTime, shiftDurationHours } from '@/utils/dates';

interface Props {
  shift: Shift;
  onClose: () => void;
  onOpen?: () => void;
}

export function ShiftModal({ shift, onClose, onOpen }: Props) {
  const hours = shiftDurationHours(shift.start_time, shift.end_time);
  const rate = shift.position?.shift_rate ?? shift.position?.hourly_rate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--tg-bg)] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--tg-hint)]/40" />
        <h2 className="text-lg font-bold">{shift.position?.name}</h2>
        <p className="text-sm text-[var(--tg-hint)]">{shift.restaurant?.name}</p>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--tg-hint)]">Дата</dt>
            <dd>{formatDate(shift.start_time)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--tg-hint)]">Час</dt>
            <dd>
              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--tg-hint)]">Тривалість</dt>
            <dd>{hours.toFixed(1)} год</dd>
          </div>
          {rate != null && (
            <div className="flex justify-between">
              <dt className="text-[var(--tg-hint)]">Оплата</dt>
              <dd>{rate} ₴</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-[var(--tg-hint)]">Статус</dt>
            <dd>{shift.status}</dd>
          </div>
        </dl>

        {onOpen && (
          <button type="button" className="btn-primary mt-5" onClick={onOpen}>
            Детальніше
          </button>
        )}
      </div>
    </div>
  );
}
