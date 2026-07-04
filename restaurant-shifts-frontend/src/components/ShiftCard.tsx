import { Link } from 'react-router-dom';
import type { Shift } from '@/types';
import { formatDate, formatTime } from '@/utils/dates';
import {
  getAvailableSlots,
  getBookedCount,
  getShiftPayLabel,
  isShiftFull,
} from '@/utils/shifts';
import { cn } from '@/utils/cn';

interface Props {
  shift: Shift;
  variant?: 'mine' | 'available' | 'urgent' | 'dayoff';
  onClick?: () => void;
}

const variantStyles = {
  mine: 'border-l-4 border-l-[var(--crew-green)]',
  available: 'border-l-4 border-l-[var(--crew-burgundy-light)]',
  urgent: 'border-l-4 border-l-[var(--crew-crimson)]',
  dayoff: 'border-l-4 border-l-[var(--crew-gray)] opacity-70',
};

export function ShiftCard({ shift, variant = 'available', onClick }: Props) {
  const booked = getBookedCount(shift);
  const available = getAvailableSlots(shift);
  const full = isShiftFull(shift);
  const pay = getShiftPayLabel(shift);

  const content = (
    <div className={cn('card cursor-pointer transition active:scale-[0.98]', variantStyles[variant])}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">
            {shift.shift_type || 'Зміна'}
          </div>
          <div className="mt-1 text-sm text-[var(--tg-hint)]">
            {shift.restaurant?.name}
          </div>
        </div>
        {shift.is_urgent && (
          <span className="rounded-full bg-[var(--crew-red)] px-2 py-0.5 text-xs text-white">
            Терміново
          </span>
        )}
      </div>
      <div className="mt-2 text-sm">
        {formatDate(shift.start_time)} · {formatTime(shift.start_time)}–
        {formatTime(shift.end_time)}
      </div>
      <div className="mt-1 text-xs text-[var(--tg-hint)]">
        {full ? (
          <span className="font-medium text-[var(--crew-burgundy)]">Заповнено</span>
        ) : (
          <>Вільно: {available}/{shift.required_employees}</>
        )}
        {booked > 0 && !full && (
          <span className="ml-2">· Заброньовано: {booked}</span>
        )}
      </div>
      {pay && <div className="mt-1 text-xs">{pay}</div>}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <Link to={`/shifts/${shift.id}`}>{content}</Link>;
}
