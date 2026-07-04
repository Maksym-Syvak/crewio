import { useEffect, useMemo, useState } from 'react';
import { useAuthStore, useShiftsStore } from '@/store';
import { BookingRow } from '@/components/BookingRow';
import { ShiftModal } from '@/components/ShiftModal';
import { dayjs } from '@/utils/dates';
import type { Shift, ShiftBooking } from '@/types';
import { cn } from '@/utils/cn';
import { isAdminRole } from '@/utils/roles';
import {
  getAdminStaffingStatus,
  getAdminStaffingTextClass,
  getAvailableSlots,
  getBookingLegendLabels,
  getEmployeeBooking,
  getShiftBookingBadgeLabel,
  getShiftBookings,
  getShiftDisplayVariant,
  isPartialBooking,
  isShiftUrgent,
} from '@/utils/shifts';

export default function CalendarPage() {
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const restaurant = useAuthStore((s) => s.restaurant);
  const shifts = useShiftsStore((s) => s.shifts);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const upsertShift = useShiftsStore((s) => s.upsertShift);
  const [month, setMonth] = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const isAdmin = Boolean(user && isAdminRole(user.role));

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

  const dayShifts = selectedDay ? (shiftsByDay.get(selectedDay) ?? []) : [];

  const dayBookings = useMemo(() => {
    const items: { booking: ShiftBooking; shift: Shift }[] = [];
    for (const shift of dayShifts) {
      for (const booking of getShiftBookings(shift).filter((b) => b.status !== 'cancelled')) {
        items.push({ booking, shift });
      }
    }
    return items.sort((a, b) => {
      const aStart = a.booking.booked_start_time ?? a.shift.start_time;
      const bStart = b.booking.booked_start_time ?? b.shift.start_time;
      return String(aStart).localeCompare(String(bStart));
    });
  }, [dayShifts]);

  const getDayVariant = (date: dayjs.Dayjs) => {
    const key = date.format('YYYY-MM-DD');
    const shiftsOnDay = shiftsByDay.get(key) ?? [];
    if (!shiftsOnDay.length) return 'dayoff';

    if (isAdmin) {
      const statuses = shiftsOnDay.map(getAdminStaffingStatus);
      if (statuses.some((s) => s === 'urgent')) return 'urgent';
      if (statuses.some((s) => s === 'partial')) return 'minePartial';
      if (statuses.some((s) => s === 'full')) return 'mine';
      if (statuses.some((s) => s === 'unbooked')) return 'available';
    } else {
      const myBooking = shiftsOnDay
        .map((s) => getEmployeeBooking(s, employee?.id))
        .find(Boolean);

      if (myBooking) {
        return isPartialBooking(myBooking) ? 'minePartial' : 'mine';
      }
    }

    if (shiftsOnDay.some((s) => isShiftUrgent(s))) return 'urgent';
    if (shiftsOnDay.some((s) => getAvailableSlots(s) > 0)) return 'available';
    return 'dayoff';
  };

  const dotColor = {
    mine: 'bg-[var(--crew-green)]',
    minePartial: 'bg-[var(--crew-amber)]',
    available: 'bg-[var(--crew-blue)]',
    urgent: 'bg-[var(--crew-red)]',
    dayoff: 'bg-[var(--crew-gray)]',
  };

  const legend = getBookingLegendLabels(isAdmin);

  const getShiftVariant = (shift: Shift) =>
    getShiftDisplayVariant(shift, { isAdmin, employeeId: employee?.id });

  const shiftCardVariant = {
    mine: 'border-l-4 border-l-[var(--crew-green)]',
    minePartial: 'border-l-4 border-l-[var(--crew-amber)]',
    available: 'border-l-4 border-l-[var(--crew-burgundy-light)]',
    urgent: 'border-l-4 border-l-[var(--crew-crimson)]',
    dayoff: 'border-l-4 border-l-[var(--crew-gray)] opacity-70',
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
        <h1 className="text-lg font-bold capitalize">{month.format('MMMM YYYY')}</h1>
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
          const shiftsOnDay = shiftsByDay.get(key) ?? [];
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
              {shiftsOnDay.length > 0 && (
                <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', dotColor[variant])} />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Legend color={dotColor.mine} label={legend.full} />
        <Legend color={dotColor.minePartial} label={legend.partial} />
        <Legend color={dotColor.available} label={legend.open} />
        <Legend color={dotColor.urgent} label="Термінова" />
      </div>

      {selectedDay && (
        <section className="mt-4 space-y-4">
          <h2 className="font-semibold">{dayjs(selectedDay).format('DD.MM.YYYY')}</h2>

          {dayShifts.length === 0 ? (
            <p className="text-sm text-[var(--tg-hint)]">Вихідний</p>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--tg-hint)]">Зміни</h3>
                {dayShifts.map((shift) => {
                  const variant = getShiftVariant(shift);
                  const badgeLabel = getShiftBookingBadgeLabel(shift, {
                    isAdmin,
                    employeeId: employee?.id,
                  });
                  const adminStatus = isAdmin ? getAdminStaffingStatus(shift) : null;
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedShift(shift)}
                    >
                      <div className={cn('card', shiftCardVariant[variant])}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{shift.shift_type || 'Зміна'}</span>
                          {badgeLabel && (
                            <span
                              className={cn(
                                'text-xs font-medium',
                                isAdmin && adminStatus
                                  ? getAdminStaffingTextClass(adminStatus)
                                  : variant === 'minePartial'
                                    ? 'text-[var(--crew-amber)]'
                                    : 'text-[var(--crew-green)]',
                              )}
                            >
                              {badgeLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-[var(--tg-hint)]">
                          {dayjs(shift.start_time).format('HH:mm')}–
                          {dayjs(shift.end_time).format('HH:mm')}
                          {' · '}
                          Вільно: {getAvailableSlots(shift)}/{shift.required_employees}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {isAdmin && dayBookings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-[var(--tg-hint)]">Персонал</h3>
                  {dayBookings.map(({ booking, shift }) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      shift={shift}
                      onClick={() => setSelectedShift(shift)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {selectedShift && (
        <ShiftModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onUpdated={(updated) => {
            upsertShift(updated);
            setSelectedShift(updated);
          }}
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
