import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { employeesApi } from '@/api/employees.api';
import { useAuthStore } from '@/store';
import type { EmployeeProfile } from '@/types';
import { formatMonth, formatShiftShort } from '@/utils/dates';
import { formatSalary } from '@/utils/employees';
import { canManageStaff } from '@/utils/roles';
import { PageSkeleton } from '@/components/Skeleton';
import { getErrorMessage } from '@/api/client';

export default function StatisticsPage() {
  const ownEmployee = useAuthStore((s) => s.employee);
  const workspaceRole = useAuthStore((s) => s.workspaceRole);
  const [params] = useSearchParams();
  const queryEmployeeId = params.get('employeeId') ?? undefined;
  const employeeId = queryEmployeeId ?? ownEmployee?.id ?? undefined;
  const isStaffManager = canManageStaff(workspaceRole);
  const month = formatMonth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setProfile(null);

      try {
        if (!employeeId) {
          return;
        }

        const data = await employeesApi.profile(employeeId);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, month]);

  if (loading) return <PageSkeleton />;

  if (!employeeId) {
    if (isStaffManager) {
      return (
        <div className="page">
          <h1 className="page-title">Статистика</h1>
          <p className="text-center text-sm text-[var(--tg-hint)]">
            Оберіть співробітника в розділі «Персонал», щоб переглянути статистику
          </p>
          <Link to="/staff" className="btn-primary mt-4 block text-center">
            Перейти до персоналу
          </Link>
        </div>
      );
    }

    return (
      <div className="page">
        <h1 className="page-title">Статистика</h1>
        <p className="text-center text-sm text-[var(--tg-hint)]">
          Статистика доступна після приєднання до закладу як працівник
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        {isStaffManager && (
          <Link to="/staff" className="mb-3 inline-block text-sm text-[var(--tg-link)]">
            ← Персонал
          </Link>
        )}
        <h1 className="page-title">Статистика</h1>
        <p className="text-center text-sm text-[var(--crew-crimson)]">
          {error ?? 'Не вдалось завантажити статистику'}
        </p>
      </div>
    );
  }

  const { employee, stats, next_shift: nextShift } = profile;
  const user = employee.user;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const bookedShifts = stats.booked_shifts ?? stats.worked_shifts ?? 0;
  const hasNoStats =
    bookedShifts === 0 &&
    (stats.worked_shifts ?? 0) === 0 &&
    Number(stats.planned_hours) === 0 &&
    Number(stats.actual_hours) === 0;
  const viewingOther = ownEmployee?.id !== employee.id;
  const maxShifts = Math.max(bookedShifts, 10);

  return (
    <div className="page">
      {viewingOther && isStaffManager && (
        <Link
          to={`/staff/${employee.id}`}
          className="mb-3 inline-block text-sm text-[var(--tg-link)]"
        >
          ← {fullName || 'Профіль співробітника'}
        </Link>
      )}

      <h1 className="page-title">Статистика</h1>
      {viewingOther && fullName && (
        <p className="mb-1 text-sm font-medium">{fullName}</p>
      )}
      <p className="mb-4 text-sm text-[var(--tg-hint)]">Місяць: {month}</p>

      {hasNoStats ? (
        <p className="text-center text-sm text-[var(--tg-hint)]">
          У працівника ще немає статистики.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Кількість змін" value={bookedShifts} />
            <Stat
              label="Заплановано годин"
              value={Number(stats.planned_hours).toFixed(1)}
            />
            <Stat
              label="Відпрацьовано годин"
              value={Number(stats.actual_hours).toFixed(1)}
            />
            <Stat
              label="Запланована зарплата"
              value={formatSalary(Number(stats.planned_salary))}
            />
            <Stat
              label="Зароблено"
              value={formatSalary(Number(stats.actual_salary))}
            />
            {nextShift && (
              <Stat
                label="Найближча зміна"
                value={formatShiftShort(nextShift.start_time)}
              />
            )}
          </div>

          <section className="card mt-6">
            <h2 className="mb-3 text-sm font-semibold">Зміни за місяць</h2>
            <div className="flex h-32 items-end gap-2">
              {Array.from({ length: 4 }).map((_, i) => {
                const h = Math.round(
                  (bookedShifts / maxShifts) * 100 * (1 - i * 0.15),
                );
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-[var(--tg-button)]"
                      style={{ height: `${Math.max(h, 8)}%` }}
                    />
                    <span className="text-[10px] text-[var(--tg-hint)]">
                      {month.slice(5)}-{i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-[var(--tg-hint)]">{label}</div>
    </div>
  );
}
