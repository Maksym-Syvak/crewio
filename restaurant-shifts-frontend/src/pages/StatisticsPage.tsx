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
  const employeeId = params.get('employeeId') ?? employee?.id;
  const month = formatMonth();
  const [stats, setStats] = useState<Statistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    statisticsApi
      .list(employeeId, month)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [employeeId, month]);

  if (loading) return <PageSkeleton />;

  const current = stats[0] ?? {
    worked_shifts: 0,
    worked_hours: 0,
    expected_salary: 0,
    replacements: 0,
  };

  const maxShifts = Math.max(current.worked_shifts, 10);

  return (
    <div className="page">
      <h1 className="page-title">Статистика</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">Місяць: {month}</p>

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
            const h = Math.round((current.worked_shifts / maxShifts) * 100 * (1 - i * 0.15));
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
