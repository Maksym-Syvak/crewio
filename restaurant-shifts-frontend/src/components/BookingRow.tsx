import type { Shift, ShiftBooking } from '@/types';
import { formatTime } from '@/utils/dates';
import { cn } from '@/utils/cn';
import { getBookingAccent, getBookingTimeRange, isPartialBooking } from '@/utils/shifts';

interface Props {
  booking: ShiftBooking;
  shift: Shift;
  onClick?: () => void;
  showStatus?: boolean;
}

export function BookingRow({ booking, shift, onClick, showStatus = true }: Props) {
  const partial = isPartialBooking(booking);
  const range = getBookingTimeRange(booking, shift);
  const name =
    `${booking.employee?.user?.first_name ?? ''} ${booking.employee?.user?.last_name ?? ''}`.trim() ||
    'Працівник';

  const content = (
    <div className={cn('card', getBookingAccent(partial))}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{name}</span>
        <span className="text-sm text-[var(--tg-hint)]">
          {formatTime(range.start)}–{formatTime(range.end)}
        </span>
      </div>
      {showStatus && (
        <div className="mt-1 text-xs text-[var(--tg-hint)]">
          {partial ? 'Часткова зміна' : 'Повна зміна'}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        {content}
      </button>
    );
  }

  return content;
}
