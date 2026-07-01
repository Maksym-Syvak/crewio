import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '@/api/employees.api';
import { useAuthStore } from '@/store';
import type { Employee } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';

export default function StaffPage() {
  const restaurant = useAuthStore((s) => s.restaurant);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    employeesApi
      .list(restaurant.id)
      .then(setStaff)
      .finally(() => setLoading(false));
  }, [restaurant]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="page-title mb-0">Персонал</h1>
        <Link to="/staff/invite" className="text-sm text-[var(--tg-link)]">
          + Запросити
        </Link>
      </div>
      <ul className="space-y-2">
        {staff.map((e) => (
          <li key={e.id} className="card flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--tg-button)] text-white">
              {e.user?.photo_url ? (
                <img
                  src={e.user.photo_url}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                e.user?.first_name?.[0] ?? '?'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {e.user?.first_name} {e.user?.last_name}
              </div>
              <div className="text-xs text-[var(--tg-hint)]">
                {e.position?.name ?? 'Без посади'} · {e.status}
              </div>
            </div>
            <Link
              to={`/statistics?employeeId=${e.id}`}
              className="text-xs text-[var(--tg-link)]"
            >
              Статистика
            </Link>
          </li>
        ))}
      </ul>
      {staff.length === 0 && (
        <p className="text-center text-sm text-[var(--tg-hint)]">
          Персонал порожній
        </p>
      )}
    </div>
  );
}
