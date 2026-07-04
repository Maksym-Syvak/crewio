import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shiftsApi } from '@/api/shifts.api';
import { replacementsApi } from '@/api/replacements.api';
import { BookingRow } from '@/components/BookingRow';
import {
  ShiftBookingForm,
  ShiftBookingStatus,
  ShiftSlotsInfo,
} from '@/components/ShiftBookingForm';
import { useAuthStore, useShiftsStore, useToastStore } from '@/store';
import { formatDate, formatTime } from '@/utils/dates';
import { getErrorMessage } from '@/api/client';
import { isAdminRole } from '@/utils/roles';
import {
  calculateBookingPayPreview,
  canBookShift,
  getEmployeeBooking,
  getPlannedHours,
  getShiftBookings,
  getShiftPayLabel,
  getShiftStatusLabel,
  isEmployeeBooked,
  isShiftFull,
  isShiftUrgent,
} from '@/utils/shifts';
import type { Shift } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employee = useAuthStore((s) => s.employee);
  const user = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);
  const upsertShift = useShiftsStore((s) => s.upsertShift);
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    shiftsApi
      .get(id)
      .then(setShift)
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = Boolean(user && isAdminRole(user.role));
  const full = shift ? isShiftFull(shift) : false;
  const isBooked = shift ? isEmployeeBooked(shift, employee?.id) : false;
  const bookings = shift ? getShiftBookings(shift).filter((b) => b.status !== 'cancelled') : [];
  const bookable = shift ? canBookShift(shift) : false;
  const myBooking = shift ? getEmployeeBooking(shift, employee?.id) : undefined;

  const handleBooked = (updated: Shift) => {
    setShift(updated);
    upsertShift(updated);
    push({ type: 'success', title: 'Зміну заброньовано' });
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
        <ShiftSlotsInfo shift={shift} />
        {isCompleted && myBooking && calculateBookingPayPreview(shift, myBooking) && (
          <Row label="Нараховано" value={calculateBookingPayPreview(shift, myBooking)!} />
        )}
      </dl>

      {bookings.length > 0 && (
        <section className="mt-4 space-y-2">
          <h2 className="mb-2 font-semibold">Забронювали</h2>
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} shift={shift} showStatus />
          ))}
        </section>
      )}

      <div className="mt-6 space-y-2">
        <ShiftBookingStatus shift={shift} employeeId={employee?.id} />

        {employee && !isBooked && !full && bookable && (
          <div className="card">
            <ShiftBookingForm
              shift={shift}
              employeeId={employee.id}
              onBooked={handleBooked}
              onError={(msg) => push({ type: 'error', title: msg })}
            />
          </div>
        )}

        {employee && isBooked && bookable && (
          <button type="button" className="btn-danger" disabled={acting} onClick={handleDecline}>
            Відмовитись
          </button>
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
