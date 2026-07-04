import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { employeesApi } from '@/api/employees.api';
import { positionsApi } from '@/api/positions.api';
import { useAuthStore, useToastStore } from '@/store';
import type { EmployeeProfile, Position } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';
import { formatDate, formatMonth, formatShiftShort } from '@/utils/dates';
import {
  formatEmployeePhone,
  formatSalary,
  getEmployeeStatusLabel,
  isEmployeeActive,
  telegramDisplayName,
  telegramProfileUrl,
} from '@/utils/employees';
import { canManageStaff } from '@/utils/roles';
import { getErrorMessage } from '@/api/client';

export default function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const restaurant = useAuthStore((s) => s.restaurant);
  const workspaceRole = useAuthStore((s) => s.workspaceRole);
  const push = useToastStore((s) => s.push);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingPosition, setCreatingPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canEdit = canManageStaff(workspaceRole);

  useEffect(() => {
    if (!employeeId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    employeesApi
      .profile(employeeId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити профіль співробітника');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!restaurant || !canEdit) return;
    positionsApi.list(restaurant.id).then(setPositions).catch(() => setPositions([]));
  }, [restaurant, canEdit]);

  const handlePositionChange = async (positionId: string) => {
    if (!employeeId || !profile) return;
    setSaving(true);
    try {
      const updated = await employeesApi.update(employeeId, {
        position_id: positionId || null,
      });
      setProfile({
        ...profile,
        employee: { ...profile.employee, ...updated, position: positions.find((p) => p.id === positionId) },
      });
      push({ type: 'success', title: 'Посаду оновлено' });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePosition = async () => {
    if (!restaurant || !newPositionName.trim()) return;
    setCreatingPosition(true);
    try {
      const created = await positionsApi.create({
        restaurant_id: restaurant.id,
        name: newPositionName.trim(),
      });
      setPositions((prev) => [...prev, created]);
      setNewPositionName('');
      await handlePositionChange(created.id);
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setCreatingPosition(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (error || !profile) {
    return (
      <div className="page">
        <button
          type="button"
          className="mb-3 text-sm text-[var(--tg-link)]"
          onClick={() => navigate('/staff')}
        >
          ← Персонал
        </button>
        <p className="text-sm text-[var(--crew-crimson)]">
          {error ?? 'Профіль не знайдено'}
        </p>
      </div>
    );
  }

  const { employee, stats, next_shift: nextShift } = profile;
  const user = employee.user;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const phone = formatEmployeePhone(employee.phone, user?.phone);
  const positionName = employee.position?.name ?? 'Без посади';
  const statusLabel = getEmployeeStatusLabel(employee.status);
  const active = isEmployeeActive(employee.status);
  const telegram = telegramDisplayName(user?.username);
  const telegramUrl = telegramProfileUrl(user?.username);
  const month = formatMonth();
  const bookedShifts = stats.booked_shifts ?? stats.worked_shifts ?? 0;

  return (
    <div className="page">
      <Link to="/staff" className="mb-3 inline-block text-sm text-[var(--tg-link)]">
        ← Персонал
      </Link>

      <div className="flex flex-col items-center text-center">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--tg-button)] text-3xl text-white">
            {user?.first_name?.[0] ?? '?'}
          </div>
        )}
        <h1 className="mt-3 text-xl font-bold">{fullName || 'Без імені'}</h1>
        <p className="mt-1 text-sm text-[var(--tg-hint)]">Посада: {positionName}</p>
        <span
          className={`mt-2 rounded-full px-3 py-0.5 text-xs ${
            active
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-[var(--tg-hint)]/15 text-[var(--tg-hint)]'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {canEdit && (
        <section className="card mt-6 space-y-3">
          <h2 className="text-sm font-semibold">Посада</h2>
          <select
            className="field-input w-full"
            value={employee.position_id ?? ''}
            disabled={saving}
            onChange={(e) => void handlePositionChange(e.target.value)}
          >
            <option value="">Без посади</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              className="field-input min-w-0 flex-1"
              placeholder="Нова посада..."
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              disabled={creatingPosition || !newPositionName.trim()}
              onClick={() => void handleCreatePosition()}
            >
              {creatingPosition ? '...' : 'Створити'}
            </button>
          </div>
        </section>
      )}

      <dl className="card mt-6 space-y-3 text-sm">
        <InfoRow label="Ім'я" value={user?.first_name ?? '—'} />
        <InfoRow label="Прізвище" value={user?.last_name ?? '—'} />
        <InfoRow label="Телефон" value={phone} />
        <InfoRow
          label="Telegram"
          value={telegram ?? 'Користувач не має публічного username'}
        />
        {!canEdit && <InfoRow label="Посада" value={positionName} />}
        <InfoRow label="Дата приєднання" value={formatDate(employee.created_at)} />
        {nextShift && (
          <InfoRow
            label="Наступна зміна"
            value={formatShiftShort(nextShift.start_time)}
          />
        )}
      </dl>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--tg-hint)]">
          Статистика · {month}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Взято змін" value={bookedShifts} />
          <StatCard
            label="Відпрацьовано годин"
            value={Number(stats.actual_hours).toFixed(1)}
          />
          <StatCard
            label="Очікувана зарплата"
            value={formatSalary(Number(stats.planned_salary))}
          />
          <StatCard
            label="Зароблено"
            value={formatSalary(Number(stats.actual_salary))}
          />
        </div>
      </section>

      <div className="mt-6 pb-4">
        {telegramUrl ? (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary block text-center"
          >
            Написати у Telegram
          </a>
        ) : (
          <p className="text-center text-sm text-[var(--tg-hint)]">
            Користувач не має публічного username
          </p>
        )}
      </div>

      <style>{`
        .field-input {
          border-radius: 10px;
          background: var(--tg-secondary-bg);
          padding: 12px;
          border: 1px solid color-mix(in srgb, var(--crew-burgundy) 15%, transparent);
          color: var(--tg-text);
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--tg-hint)]">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs text-[var(--tg-hint)]">{label}</div>
    </div>
  );
}
