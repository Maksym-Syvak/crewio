import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { statisticsApi } from '@/api/statistics.api';
import { useAuthStore } from '@/store';
import type { Statistics } from '@/types';
import { formatMonth } from '@/utils/dates';
import { PageSkeleton } from '@/components/Skeleton';

export default function StatisticsPage() {
  const employee = useAuthStore((s) => s.employee);
  const [params] = useSearchParams();
  const employeeId = params.get('employeeId') ?? employee?.id ?? undefined;
  const month = formatMonth();
  const [stats, setStats] = useState<Statistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
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
  }, [employeeId, month]);

  if (loading) return <PageSkeleton />;

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
    booked_shifts: 0,
    planned_hours: 0,
    actual_hours: 0,
    worked_hours: 0,
    planned_salary: 0,
    actual_salary: 0,
    expected_salary: 0,
    replacements: 0,
  };

  const bookedShifts = current.booked_shifts ?? current.worked_shifts;
  const maxShifts = Math.max(bookedShifts, 10);

  return (
    <div className="page">
      <h1 className="page-title">Статистика</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">Місяць: {month}</p>

      {error && (
        <p className="mb-4 text-sm text-[var(--crew-crimson)]">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Заброньовано змін" value={bookedShifts} />
        <Stat label="Відпрацьовано змін" value={current.worked_shifts} />
        <Stat label="Заплановано годин" value={Number(current.planned_hours).toFixed(1)} />
        <Stat label="Відпрацьовано годин" value={Number(current.actual_hours).toFixed(1)} />
        <Stat label="Замін" value={current.replacements} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Запланована зарплата" value={`${Math.round(Number(current.planned_salary))} ₴`} />
        <Stat label="Зароблено" value={`${Math.round(Number(current.actual_salary))} ₴`} />
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
