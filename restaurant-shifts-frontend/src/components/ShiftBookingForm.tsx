import { useState } from 'react';
import type { BookingType, Shift } from '@/types';
import { formatTime } from '@/utils/dates';
import { shiftsApi, type BookShiftPayload } from '@/api/shifts.api';
import { getErrorMessage } from '@/api/client';
import {
  canBookShift,
  getAvailableSlots,
  getBookedCount,
  getEmployeeBooking,
  getShiftBookingBadgeLabel,
  isPartialBooking,
  isShiftFull,
  shiftHasPartialBookings,
} from '@/utils/shifts';
import { RequiredEmployeesEditor } from '@/components/RequiredEmployeesEditor';

interface Props {
  shift: Shift;
  employeeId: string;
  onBooked: (shift: Shift) => void;
  onError: (message: string) => void;
}

export function ShiftBookingForm({ shift, employeeId, onBooked, onError }: Props) {
  const [bookingType, setBookingType] = useState<BookingType>('full');
  const [partialStart, setPartialStart] = useState(formatTime(shift.start_time));
  const [partialEnd, setPartialEnd] = useState(formatTime(shift.end_time));
  const [acting, setActing] = useState(false);

  const buildPayload = (): BookShiftPayload => {
    const base: BookShiftPayload = { employee_id: employeeId, booking_type: bookingType };
    if (bookingType === 'partial') {
      const date = shift.shift_date ?? shift.start_time.slice(0, 10);
      return {
        ...base,
        booked_start_time: new Date(`${date}T${partialStart}`).toISOString(),
        booked_end_time: new Date(`${date}T${partialEnd}`).toISOString(),
      };
    }
    return base;
  };

  const handleBook = async () => {
    setActing(true);
    try {
      const updated = await shiftsApi.book(shift.id, buildPayload());
      onBooked(updated);
    } catch (e) {
      onError(getErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Тип бронювання</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name={`booking_type_${shift.id}`}
          checked={bookingType === 'full'}
          onChange={() => setBookingType('full')}
        />
        Повна ({formatTime(shift.start_time)}–{formatTime(shift.end_time)})
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name={`booking_type_${shift.id}`}
          checked={bookingType === 'partial'}
          onChange={() => setBookingType('partial')}
        />
        Часткова
      </label>
      {bookingType === 'partial' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--tg-hint)]">Початок</span>
            <input
              type="time"
              className="w-full rounded-lg bg-[var(--tg-secondary-bg)] p-2"
              value={partialStart}
              onChange={(e) => setPartialStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--tg-hint)]">Кінець</span>
            <input
              type="time"
              className="w-full rounded-lg bg-[var(--tg-secondary-bg)] p-2"
              value={partialEnd}
              onChange={(e) => setPartialEnd(e.target.value)}
            />
          </label>
        </div>
      )}
      <button type="button" className="btn-primary" disabled={acting} onClick={handleBook}>
        {acting ? '...' : 'Забронювати зміну'}
      </button>
    </div>
  );
}

export function ShiftBookingStatus({
  shift,
  employeeId,
  isAdmin = false,
}: {
  shift: Shift;
  employeeId?: string;
  isAdmin?: boolean;
}) {
  const full = isShiftFull(shift);
  const bookable = canBookShift(shift);
  const badgeLabel = getShiftBookingBadgeLabel(shift, { isAdmin, employeeId });

  if (badgeLabel) {
    const booking = getEmployeeBooking(shift, employeeId);
    const partial = isAdmin
      ? shiftHasPartialBookings(shift)
      : booking
        ? isPartialBooking(booking)
        : false;

    return (
      <div
        className={
          partial
            ? 'rounded-lg border border-[var(--crew-amber)] bg-[color-mix(in_srgb,var(--crew-amber)_8%,transparent)] px-4 py-3 text-center text-sm font-semibold text-[var(--crew-amber)]'
            : 'rounded-lg border border-[var(--crew-green)] bg-[color-mix(in_srgb,var(--crew-green)_8%,transparent)] px-4 py-3 text-center text-sm font-semibold text-[var(--crew-green)]'
        }
      >
        {badgeLabel}
      </div>
    );
  }

  if (full || !bookable) {
    return (
      <div className="rounded-lg bg-[var(--tg-secondary-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--tg-hint)]">
        {full ? 'Місць немає' : 'Бронювання недоступне'}
      </div>
    );
  }

  return null;
}

export function ShiftSlotsInfo({
  shift,
  editable,
  onUpdated,
  onError,
}: {
  shift: Shift;
  editable?: boolean;
  onUpdated?: (shift: Shift) => void;
  onError?: (message: string) => void;
}) {
  const booked = getBookedCount(shift);
  const available = getAvailableSlots(shift);

  return (
    <>
      {editable && onUpdated && onError ? (
        <RequiredEmployeesEditor shift={shift} onUpdated={onUpdated} onError={onError} />
      ) : (
        <InfoRow label="Необхідно працівників" value={String(shift.required_employees)} />
      )}
      <InfoRow label="Заброньовано" value={String(booked)} />
      <InfoRow label="Вільних місць" value={String(available)} highlight />
    </>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--tg-hint)]">{label}</span>
      <span className={highlight ? 'font-semibold text-right' : 'text-right'}>{value}</span>
    </div>
  );
}
