import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { statisticsApi } from '@/api/statistics.api';
import { employeesApi } from '@/api/employees.api';
import { useAuthStore } from '@/store';
import type { Employee, Statistics } from '@/types';
import { formatMonth } from '@/utils/dates';
import { PageSkeleton } from '@/components/Skeleton';
import { isAdminRole } from '@/utils/roles';

export default function StatisticsPage() {
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const [params] = useSearchParams();
  const employeeId = params.get('employeeId') ?? employee?.id ?? undefined;
  const month = formatMonth();
  const [stats, setStats] = useState<Statistics[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showStaffPicker =
    !employeeId && Boolean(user && isAdminRole(user.role) && restaurant);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (showStaffPicker && restaurant) {
          const list = await employeesApi.list(restaurant.id, 1, 100);
          if (!cancelled) setStaff(list.data);
          return;
        }

        if (!employeeId) {
          return;
        }

        const data = await statisticsApi.list(employeeId, month);
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) {
          setError('Не вдалось завантажити статистику');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, month, showStaffPicker, restaurant]);

  if (loading) return <PageSkeleton />;

  if (showStaffPicker) {
    return (
      <div className="page">
        <h1 className="page-title">Статистика персоналу</h1>
        <p className="mb-4 text-sm text-[var(--tg-hint)]">
          Оберіть співробітника для перегляду статистики
        </p>
        {staff.length === 0 ? (
          <p className="text-center text-sm text-[var(--tg-hint)]">
            Персонал ще не додано
          </p>
        ) : (
          <ul className="space-y-2">
            {staff.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/statistics?employeeId=${e.id}`}
                  className="card flex items-center justify-between"
                >
                  <span>
                    {e.user?.first_name} {e.user?.last_name}
                  </span>
                  <span className="text-sm text-[var(--tg-link)]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="page">
        <h1 className="page-title">Статистика</h1>
        <p className="text-center text-sm text-[var(--tg-hint)]">
          Статистика доступна після приєднання до закладу як працівник
        </p>
      </div>
    );
  }

  const current = stats[0] ?? {
    worked_shifts: 0,
    worked_hours: 0,
    expected_salary: 0,
    replacements: 0,
  };

  const maxShifts = Math.max(current.worked_shifts, 10);

  return (
    <div className="page">
      {user && isAdminRole(user.role) && (
        <Link to="/statistics" className="mb-3 inline-block text-sm text-[var(--tg-link)]">
          ← Усі співробітники
        </Link>
      )}
      <h1 className="page-title">Статистика</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">Місяць: {month}</p>

      {error && (
        <p className="mb-4 text-sm text-[var(--crew-crimson)]">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Змін" value={current.worked_shifts} />
        <Stat label="Годин" value={current.worked_hours} />
        <Stat label="Замін" value={current.replacements} />
        <Stat label="Зарплата" value={`${current.expected_salary} ₴`} />
      </div>

      <section className="card mt-6">
        <h2 className="mb-3 text-sm font-semibold">Зміни за місяць</h2>
        <div className="flex h-32 items-end gap-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const h = Math.round(
              (current.worked_shifts / maxShifts) * 100 * (1 - i * 0.15),
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
