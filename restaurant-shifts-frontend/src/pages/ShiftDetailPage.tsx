import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shiftsApi } from '@/api/shifts.api';
import { replacementsApi } from '@/api/replacements.api';
import { useAuthStore, useToastStore } from '@/store';
import { formatDate, formatTime } from '@/utils/dates';
import { getErrorMessage } from '@/api/client';
import { isAdminRole } from '@/utils/roles';
import {
  calculateBookingPayPreview,
  canBookShift,
  getAvailableSlots,
  getBookedCount,
  getBookingEmoji,
  getBookingTimeRange,
  getPlannedHours,
  getShiftBookings,
  getShiftPayLabel,
  getShiftStatusLabel,
  isEmployeeBooked,
  isPartialBooking,
  isShiftFull,
  isShiftUrgent,
} from '@/utils/shifts';
import type { BookingType, Shift } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType>('full');
  const [partialStart, setPartialStart] = useState('');
  const [partialEnd, setPartialEnd] = useState('');

  useEffect(() => {
    if (!id) return;
    shiftsApi
      .get(id)
      .then((s) => {
        setShift(s);
        setPartialStart(formatTime(s.start_time));
        setPartialEnd(formatTime(s.end_time));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = Boolean(user && isAdminRole(user.role));
  const booked = shift ? getBookedCount(shift) : 0;
  const available = shift ? getAvailableSlots(shift) : 0;
  const full = shift ? isShiftFull(shift) : false;
  const isBooked = shift ? isEmployeeBooked(shift, employee?.id) : false;
  const bookings = shift ? getShiftBookings(shift).filter((b) => b.status !== 'cancelled') : [];
  const bookable = shift ? canBookShift(shift) : false;

  const buildBookPayload = () => {
    if (!shift || !employee) return null;
    const base = { employee_id: employee.id, booking_type: bookingType };
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
    if (!shift || !employee) return;
    const payload = buildBookPayload();
    if (!payload) return;

    setActing(true);
    try {
      const updated = await shiftsApi.book(shift.id, payload);
      setShift(updated);
      push({ type: 'success', title: 'Зміну заброньовано' });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (!shift || !employee) return;
    if (!confirm('Відмовитись від зміни?')) return;
    setActing(true);
    try {
      await shiftsApi.cannotMakeIt(shift.id, employee.id);
      push({ type: 'info', title: 'Бронювання скасовано' });
      navigate('/shifts');
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  const handleApplyReplacement = async () => {
    if (!shift || !employee) return;
    setActing(true);
    try {
      const requests = await replacementsApi.list(shift.id);
      const pending = requests.find((r) => r.status === 'pending');
      if (!pending) {
        push({ type: 'error', title: 'Немає активного запиту на заміну' });
        return;
      }
      await replacementsApi.apply(pending.id, employee.id);
      push({ type: 'success', title: 'Ви відгукнулись на заміну' });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  const handleMarkDayOff = async () => {
    if (!shift) return;
    if (!confirm('Скасувати цю зміну (вихідний)?')) return;
    setActing(true);
    try {
      await shiftsApi.remove(shift.id);
      push({ type: 'success', title: 'Зміну скасовано' });
      navigate(-1);
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  const handleChangeRequired = async () => {
    if (!shift) return;
    const raw = prompt('Нова кількість працівників:', String(shift.required_employees));
    if (!raw) return;
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 1) {
      push({ type: 'error', title: 'Некоректне число' });
      return;
    }
    setActing(true);
    try {
      const updated = await shiftsApi.update(shift.id, { required_employees: next });
      setShift(updated);
      push({ type: 'success', title: 'Оновлено' });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!shift) {
    return (
      <div className="page text-center">
        <p>Зміну не знайдено</p>
        <button type="button" className="btn-primary mt-4" onClick={() => navigate(-1)}>
          Назад
        </button>
      </div>
    );
  }

  const hours = getPlannedHours(shift);
  const pay = getShiftPayLabel(shift);
  const isCompleted = shift.status === 'completed';
  const myBooking = bookings.find((b) => b.employee_id === employee?.id);

  return (
    <div className="page">
      <button type="button" className="mb-3 text-sm text-[var(--tg-link)]" onClick={() => navigate(-1)}>
        ← Назад
      </button>

      {isShiftUrgent(shift) && (
        <div className="mb-4 rounded-xl bg-[var(--crew-red)] px-4 py-3 text-white">
          🚨 ТЕРМІНОВО
        </div>
      )}

      <h1 className="text-xl font-bold">{shift.shift_type || 'Зміна'}</h1>
      <p className="text-[var(--tg-hint)]">{shift.restaurant?.name}</p>

      <dl className="card mt-4 space-y-3 text-sm">
        <Row label="Дата" value={formatDate(shift.start_time)} />
        <Row label="Час" value={`${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`} />
        <Row label="Тривалість" value={`${hours.toFixed(1)} год`} />
        {pay && <Row label="Ставка" value={pay} />}
        <Row label="Статус" value={getShiftStatusLabel(shift.status)} />
        <Row label="Вільно" value={`${available}/${shift.required_employees}`} />
        <Row label="Заброньовано" value={`${booked}/${shift.required_employees}`} />
        {isCompleted && myBooking && calculateBookingPayPreview(shift, myBooking) && (
          <Row label="Нараховано" value={calculateBookingPayPreview(shift, myBooking)!} />
        )}
      </dl>

      {bookings.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 font-semibold">Забронювали</h2>
          <ul className="space-y-2">
            {bookings.map((b) => {
              const range = getBookingTimeRange(b, shift);
              return (
                <li key={b.id} className="card flex items-center gap-3 text-sm">
                  <span className="text-base">{getBookingEmoji(b)}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tg-button)] text-white">
                    {b.employee?.user?.first_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1">
                    <div>
                      {b.employee?.user?.first_name} {b.employee?.user?.last_name}
                    </div>
                    <div className="text-xs text-[var(--tg-hint)]">
                      {formatTime(range.start)}–{formatTime(range.end)}
                      {isPartialBooking(b) ? ' · часткова' : ' · повна'}
                    </div>
                  </div>
                  {isCompleted && calculateBookingPayPreview(shift, b) && (
                    <div className="text-xs font-medium">{calculateBookingPayPreview(shift, b)}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-2">
        {employee && !isBooked && !full && bookable && (
          <div className="card space-y-3">
            <h3 className="font-semibold">Тип бронювання</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="booking_type"
                checked={bookingType === 'full'}
                onChange={() => setBookingType('full')}
              />
              Повна ({formatTime(shift.start_time)}–{formatTime(shift.end_time)})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="booking_type"
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
              Забронювати
            </button>
          </div>
        )}
        {employee && isBooked && bookable && (
          <button type="button" className="btn-danger" disabled={acting} onClick={handleDecline}>
            Відмовитись
          </button>
        )}
        {full && !isBooked && (
          <p className="text-center text-sm font-medium text-[var(--crew-burgundy)]">Заповнено</p>
        )}
        {!bookable && !isCompleted && (
          <p className="text-center text-sm text-[var(--tg-hint)]">
            {shift.status === 'active' ? 'Зміна в процесі' : 'Бронювання недоступне'}
          </p>
        )}
        {isShiftUrgent(shift) && employee && !isBooked && !full && bookable && (
          <button type="button" className="btn-secondary" disabled={acting} onClick={handleApplyReplacement}>
            Відгукнутись на заміну
          </button>
        )}
        {isAdmin && (
          <>
            <button type="button" className="btn-secondary" disabled={acting} onClick={handleChangeRequired}>
              Змінити кількість працівників
            </button>
            {!isCompleted && shift.status !== 'active' && (
              <button type="button" className="btn-secondary" disabled={acting} onClick={handleMarkDayOff}>
                Зробити вихідним
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--tg-hint)]">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
