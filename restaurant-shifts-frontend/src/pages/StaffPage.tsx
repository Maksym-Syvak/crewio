import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '@/api/employees.api';
import { useAuthStore } from '@/store';
import type { Employee } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';

const PAGE_SIZE = 20;

export default function StaffPage() {
  const restaurant = useAuthStore((s) => s.restaurant);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!restaurant) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await employeesApi.list(restaurant.id, pageNum, PAGE_SIZE);
        setStaff((prev) => (append ? [...prev, ...res.data] : res.data));
        setHasMore(res.meta.hasMore);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [restaurant],
  );

  useEffect(() => {
    if (!restaurant) return;
    loadPage(1, false);
  }, [restaurant, loadPage]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadPage(page + 1, true);
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadPage, page]);

  if (loading && staff.length === 0) return <PageSkeleton />;

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
      {hasMore && <div ref={sentinelRef} className="h-8" />}
      {loadingMore && (
        <p className="py-3 text-center text-sm text-[var(--tg-hint)]">
          Завантаження...
        </p>
      )}
    </div>
  );
}
