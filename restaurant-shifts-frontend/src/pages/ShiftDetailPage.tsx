import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shiftsApi } from '@/api/shifts.api';
import { replacementsApi } from '@/api/replacements.api';
import { useAuthStore, useToastStore } from '@/store';
import { formatDate, formatTime, shiftDurationHours } from '@/utils/dates';
import { getErrorMessage } from '@/api/client';
import { isAdminRole } from '@/utils/roles';
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

  useEffect(() => {
    if (!id) return;
    shiftsApi
      .get(id)
      .then(setShift)
      .finally(() => setLoading(false));
  }, [id]);

  const isBooked = shift?.assignments?.some(
    (a) => a.employee_id === employee?.id,
  );

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
    if (!confirm('Відмовитись від зміни?')) return;
    setActing(true);
    try {
      await shiftsApi.cannotMakeIt(shift.id, employee.id);
      push({ type: 'info', title: 'Запит на заміну надіслано' });
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

  const isAdmin = Boolean(user && isAdminRole(user.role));

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

  const hours = shiftDurationHours(shift.start_time, shift.end_time);
  const rate = shift.position?.shift_rate ?? shift.position?.hourly_rate;

  return (
    <div className="page">
      <button
        type="button"
        className="mb-3 text-sm text-[var(--tg-link)]"
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>

      {shift.is_urgent && (
        <div className="mb-4 rounded-xl bg-[var(--crew-red)] px-4 py-3 text-white">
          ⚡ Термінова зміна
        </div>
      )}

      <h1 className="text-xl font-bold">{shift.position?.name}</h1>
      <p className="text-[var(--tg-hint)]">{shift.restaurant?.name}</p>

      <dl className="card mt-4 space-y-3 text-sm">
        <Row label="Дата" value={formatDate(shift.start_time)} />
        <Row
          label="Час"
          value={`${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`}
        />
        <Row label="Тривалість" value={`${hours.toFixed(1)} год`} />
        {rate != null && <Row label="Оплата" value={`${rate} ₴`} />}
        <Row label="Статус" value={shift.status} />
        <Row
          label="Працівники"
          value={`${shift.assignments?.length ?? 0} / ${shift.required_employees}`}
        />
      </dl>

      {shift.assignments && shift.assignments.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 font-semibold">На зміні</h2>
          <ul className="space-y-2">
            {shift.assignments.map((a) => (
              <li key={a.id} className="card flex items-center gap-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tg-button)] text-white">
                  {a.employee?.user?.first_name?.[0] ?? '?'}
                </div>
                <div>
                  {a.employee?.user?.first_name} {a.employee?.user?.last_name}
                  <div className="text-xs text-[var(--tg-hint)]">
                    {a.employee?.position?.name}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-2">
        {!isBooked && employee && (
          <button
            type="button"
            className="btn-primary"
            disabled={acting}
            onClick={handleBook}
          >
            Забронювати
          </button>
        )}
        {isBooked && employee && (
          <button
            type="button"
            className="btn-danger"
            disabled={acting}
            onClick={handleDecline}
          >
            Відмовитись
          </button>
        )}
        {!isBooked && shift.is_urgent && employee && (
          <button
            type="button"
            className="btn-secondary"
            disabled={acting}
            onClick={handleApplyReplacement}
          >
            Запропонувати заміну
          </button>
        )}
        {isAdmin && (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={acting}
              onClick={handleMarkDayOff}
            >
              Зробити вихідним
            </button>
            {!shift.is_urgent && (
              <button
                type="button"
                className="btn-secondary"
                disabled={acting}
                onClick={handleMarkHoliday}
              >
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
