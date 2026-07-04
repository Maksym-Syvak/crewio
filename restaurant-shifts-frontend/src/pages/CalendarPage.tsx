import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useShiftsStore } from '@/store';
import { dayjs, formatTime } from '@/utils/dates';
import type { Shift, ShiftBooking } from '@/types';
import { cn } from '@/utils/cn';
import {
  getBookingEmoji,
  getBookingTimeRange,
  getShiftBookings,
  isEmployeeBooked,
  isShiftUrgent,
} from '@/utils/shifts';

export default function CalendarPage() {
  const navigate = useNavigate();
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const shifts = useShiftsStore((s) => s.shifts);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const [month, setMonth] = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) fetchShifts(restaurant.id);
  }, [restaurant, fetchShifts]);

  const days = useMemo(() => {
    const start = month.startOf('month').startOf('week');
    const end = month.endOf('month').endOf('week');
    const result: dayjs.Dayjs[] = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, 'day')) {
      result.push(d);
      d = d.add(1, 'day');
    }
    return result;
  }, [month]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const key = dayjs(s.start_time).format('YYYY-MM-DD');
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [shifts]);

  const dayBookings = useMemo(() => {
    if (!selectedDay) return [];
    const dayShifts = shiftsByDay.get(selectedDay) ?? [];
    const items: { booking: ShiftBooking; shift: Shift }[] = [];
    for (const shift of dayShifts) {
      for (const booking of getShiftBookings(shift).filter((b) => b.status !== 'cancelled')) {
        items.push({ booking, shift });
      }
    }
    return items.sort((a, b) => {
      const aStart = getBookingTimeRange(a.booking, a.shift).start;
      const bStart = getBookingTimeRange(b.booking, b.shift).start;
      return aStart.localeCompare(bStart);
    });
  }, [selectedDay, shiftsByDay]);

  const getDayVariant = (date: dayjs.Dayjs) => {
    const key = date.format('YYYY-MM-DD');
    const dayShifts = shiftsByDay.get(key) ?? [];
    if (!dayShifts.length) return 'dayoff';
    if (dayShifts.some((s) => isShiftUrgent(s))) return 'urgent';
    if (dayShifts.some((s) => isEmployeeBooked(s, employee?.id))) return 'mine';
    return 'available';
  };

  const dotColor = {
    mine: 'bg-[var(--crew-green)]',
    available: 'bg-[var(--crew-blue)]',
    urgent: 'bg-[var(--crew-red)]',
    dayoff: 'bg-[var(--crew-gray)]',
  };

  return (
    <div className="page">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="text-[var(--tg-link)]"
          onClick={() => setMonth((m) => m.subtract(1, 'month'))}
        >
          ‹
        </button>
        <h1 className="text-lg font-bold capitalize">
          {month.format('MMMM YYYY')}
        </h1>
        <button
          type="button"
          className="text-[var(--tg-link)]"
          onClick={() => setMonth((m) => m.add(1, 'month'))}
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-xs text-[var(--tg-hint)]">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const variant = getDayVariant(d);
          const key = d.format('YYYY-MM-DD');
          const dayShifts = shiftsByDay.get(key) ?? [];
          const inMonth = d.month() === month.month();
          const selected = selectedDay === key;

          return (
            <button
              key={key}
              type="button"
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-lg text-sm',
                !inMonth && 'opacity-30',
                d.isSame(dayjs(), 'day') && 'ring-2 ring-[var(--tg-link)]',
                selected && 'bg-[var(--tg-secondary-bg)]',
              )}
              onClick={() => setSelectedDay(key)}
            >
              {d.date()}
              {dayShifts.length > 0 && (
                <span
                  className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', dotColor[variant])}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Legend color="bg-[var(--crew-green)]" label="Моя зміна" />
        <Legend color="bg-[var(--crew-blue)]" label="Доступна" />
        <Legend color="bg-[var(--crew-red)]" label="Термінова" />
        <Legend emoji="🟢" label="Повна" />
        <Legend emoji="🟠" label="Часткова" />
      </div>

      {selectedDay && (
        <section className="card mt-4">
          <h2 className="mb-3 font-semibold">{dayjs(selectedDay).format('DD.MM.YYYY')}</h2>
          {dayBookings.length === 0 ? (
            <p className="text-sm text-[var(--tg-hint)]">
              {(shiftsByDay.get(selectedDay) ?? []).length > 0
                ? 'Немає бронювань — зміни доступні для запису'
                : 'Вихідний'}
            </p>
          ) : (
            <ul className="space-y-2">
              {dayBookings.map(({ booking, shift }) => {
                const range = getBookingTimeRange(booking, shift);
                const name = `${booking.employee?.user?.first_name ?? ''} ${booking.employee?.user?.last_name ?? ''}`.trim();
                return (
                  <li key={booking.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg bg-[var(--tg-secondary-bg)] px-3 py-2 text-left text-sm"
                      onClick={() => navigate(`/shifts/${shift.id}`)}
                    >
                      <span>{getBookingEmoji(booking)}</span>
                      <span className="font-medium">{name || 'Працівник'}</span>
                      <span className="ml-auto text-[var(--tg-hint)]">
                        {formatTime(range.start)}–{formatTime(range.end)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Legend({ color, label, emoji }: { color?: string; label: string; emoji?: string }) {
  return (
    <span className="flex items-center gap-1">
      {emoji ? <span>{emoji}</span> : <span className={cn('h-2 w-2 rounded-full', color)} />}
      {label}
    </span>
  );
}
