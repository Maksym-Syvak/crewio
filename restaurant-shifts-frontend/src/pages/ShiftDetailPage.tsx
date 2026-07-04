import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shiftsApi } from '@/api/shifts.api';
import { replacementsApi } from '@/api/replacements.api';
import { useAuthStore, useToastStore } from '@/store';
import { formatDate, formatTime } from '@/utils/dates';
import { getErrorMessage } from '@/api/client';
import { isAdminRole } from '@/utils/roles';
import {
  calculateShiftPayPreview,
  getAvailableSlots,
  getBookedCount,
  getPlannedHours,
  getActualHours,
  getShiftBookings,
  getShiftPayLabel,
  isEmployeeBooked,
  isShiftFull,
} from '@/utils/shifts';
import type { Shift } from '@/types';
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
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');

  useEffect(() => {
    if (!id) return;
    shiftsApi
      .get(id)
      .then((s) => {
        setShift(s);
        setActualStart(formatTime(s.start_time));
        setActualEnd(formatTime(s.end_time));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = Boolean(user && isAdminRole(user.role));
  const booked = shift ? getBookedCount(shift) : 0;
  const available = shift ? getAvailableSlots(shift) : 0;
  const full = shift ? isShiftFull(shift) : false;
  const isBooked = shift ? isEmployeeBooked(shift, employee?.id) : false;
  const bookings = shift ? getShiftBookings(shift).filter((b) => b.status !== 'cancelled') : [];

  const handleBook = async () => {
    if (!shift || !employee) return;
    setActing(true);
    try {
      const updated = await shiftsApi.book(shift.id, employee.id);
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
    if (!confirm('Відмовитись від зміни? Запуститься термінова заміна для інших.')) return;
    setActing(true);
    try {
      await shiftsApi.cannotMakeIt(shift.id, employee.id);
      push({ type: 'info', title: 'Термінова заміна активована' });
      navigate('/emergency');
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

  const handleMarkHoliday = async () => {
    if (!shift) return;
    setActing(true);
    try {
      const updated = await shiftsApi.update(shift.id, { is_urgent: true });
      setShift(updated);
      push({ type: 'success', title: 'Позначено як святкову зміну' });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!shift || !actualStart || !actualEnd) return;
    const date = shift.shift_date ?? shift.start_time.slice(0, 10);
    const startIso = new Date(`${date}T${actualStart}`).toISOString();
    const endIso = new Date(`${date}T${actualEnd}`).toISOString();

    setActing(true);
    try {
      const updated = await shiftsApi.close(shift.id, {
        actual_start_time: startIso,
        actual_end_time: endIso,
      });
      setShift(updated);
      setShowCloseForm(false);
      push({ type: 'success', title: 'Зміну закрито', body: calculateShiftPayPreview(updated) ?? undefined });
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
  const actualHours = getActualHours(shift);
  const pay = getShiftPayLabel(shift);
  const payPreview = calculateShiftPayPreview(shift);
  const isCompleted = shift.status === 'completed';

  return (
    <div className="page">
      <button type="button" className="mb-3 text-sm text-[var(--tg-link)]" onClick={() => navigate(-1)}>
        ← Назад
      </button>

      {shift.is_urgent && (
        <div className="mb-4 rounded-xl bg-[var(--crew-red)] px-4 py-3 text-white">
          ⚡ Термінова зміна
        </div>
      )}

      <h1 className="text-xl font-bold">{shift.shift_type || 'Зміна'}</h1>
      <p className="text-[var(--tg-hint)]">{shift.restaurant?.name}</p>

      <dl className="card mt-4 space-y-3 text-sm">
        <Row label="Дата" value={formatDate(shift.start_time)} />
        <Row label="Час" value={`${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`} />
        <Row label="Тривалість" value={`${hours.toFixed(1)} год`} />
        {pay && <Row label="Ставка" value={pay} />}
        {isCompleted && (
          <>
            <Row
              label="Фактичний час"
              value={`${formatTime(shift.actual_start_time!)} – ${formatTime(shift.actual_end_time!)}`}
            />
            <Row label="Фактично годин" value={`${actualHours.toFixed(1)} год`} />
            {payPreview && <Row label="Нараховано" value={payPreview} />}
          </>
        )}
        <Row label="Статус" value={isCompleted ? 'Завершено' : full ? 'Заповнено' : shift.status} />
        <Row label="Вільно" value={`${available}/${shift.required_employees}`} />
        <Row label="Заброньовано" value={`${booked}/${shift.required_employees}`} />
      </dl>

      {bookings.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 font-semibold">Забронювали</h2>
          <ul className="space-y-2">
            {bookings.map((b) => (
              <li key={b.id} className="card flex items-center gap-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tg-button)] text-white">
                  {b.employee?.user?.first_name?.[0] ?? '?'}
                </div>
                <div>
                  {b.employee?.user?.first_name} {b.employee?.user?.last_name}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-2">
        {employee && !isBooked && !full && (
          <button type="button" className="btn-primary" disabled={acting} onClick={handleBook}>
            Забронювати
          </button>
        )}
        {employee && isBooked && (
          <button type="button" className="btn-danger" disabled={acting} onClick={handleDecline}>
            Відмовитись
          </button>
        )}
        {full && !isBooked && (
          <p className="text-center text-sm font-medium text-[var(--crew-burgundy)]">Заповнено</p>
        )}
        {!isBooked && shift.is_urgent && employee && !full && (
          <button type="button" className="btn-secondary" disabled={acting} onClick={handleApplyReplacement}>
            Відгукнутись на заміну
          </button>
        )}
        {isAdmin && (
          <>
            {!isCompleted && booked > 0 && (
              <>
                {!showCloseForm ? (
                  <button type="button" className="btn-primary" disabled={acting} onClick={() => setShowCloseForm(true)}>
                    Закрити зміну
                  </button>
                ) : (
                  <div className="card space-y-3">
                    <h3 className="font-semibold">Закрити зміну</h3>
                    <p className="text-sm text-[var(--tg-hint)]">
                      Плановий час: {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-[var(--tg-hint)]">Фактичний початок</span>
                        <input
                          type="time"
                          className="field-input w-full rounded-lg bg-[var(--tg-secondary-bg)] p-2"
                          value={actualStart}
                          onChange={(e) => setActualStart(e.target.value)}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block text-[var(--tg-hint)]">Фактичний кінець</span>
                        <input
                          type="time"
                          className="field-input w-full rounded-lg bg-[var(--tg-secondary-bg)] p-2"
                          value={actualEnd}
                          onChange={(e) => setActualEnd(e.target.value)}
                        />
                      </label>
                    </div>
                    {shift.payment_type === 'hourly' && shift.hourly_rate && (
                      <p className="text-sm">
                        Розрахунок: {actualHours.toFixed(1)} год × {shift.hourly_rate} ₴
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary flex-1" disabled={acting} onClick={handleCloseShift}>
                        Підтвердити
                      </button>
                      <button type="button" className="btn-secondary" disabled={acting} onClick={() => setShowCloseForm(false)}>
                        Скасувати
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <button type="button" className="btn-secondary" disabled={acting} onClick={handleChangeRequired}>
              Змінити кількість працівників
            </button>
            <button type="button" className="btn-secondary" disabled={acting} onClick={handleMarkDayOff}>
              Зробити вихідним
            </button>
            {!shift.is_urgent && (
              <button type="button" className="btn-secondary" disabled={acting} onClick={handleMarkHoliday}>
                Святкова зміна
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
