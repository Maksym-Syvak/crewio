import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useShiftsStore } from '@/store';
import { ShiftModal } from '@/components/ShiftModal';
import { dayjs } from '@/utils/dates';
import type { Shift } from '@/types';
import { cn } from '@/utils/cn';
import { isEmployeeBooked } from '@/utils/shifts';

export default function CalendarPage() {
  const navigate = useNavigate();
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const shifts = useShiftsStore((s) => s.shifts);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const [month, setMonth] = useState(dayjs());
  const [selected, setSelected] = useState<Shift | null>(null);

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

  const getDayVariant = (date: dayjs.Dayjs) => {
    const key = date.format('YYYY-MM-DD');
    const dayShifts = shiftsByDay.get(key) ?? [];
    if (!dayShifts.length) return 'dayoff';
    if (dayShifts.some((s) => s.is_urgent)) return 'urgent';
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

          return (
            <button
              key={key}
              type="button"
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-lg text-sm',
                !inMonth && 'opacity-30',
                d.isSame(dayjs(), 'day') && 'ring-2 ring-[var(--tg-link)]',
              )}
              onClick={() => {
                if (dayShifts.length === 1) setSelected(dayShifts[0]);
                else if (dayShifts.length > 1) setSelected(dayShifts[0]);
              }}
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
        <Legend color="bg-[var(--crew-gray)]" label="Вихідний" />
      </div>

      {selected && (
        <ShiftModal
          shift={selected}
          onClose={() => setSelected(null)}
          onOpen={() => navigate(`/shifts/${selected.id}`)}
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      {label}
    </span>
  );
}
