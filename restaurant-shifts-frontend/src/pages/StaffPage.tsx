import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '@/api/employees.api';
import { useAuthStore } from '@/store';
import type { Employee } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';

const PAGE_SIZE = 20;

const STAFF_LOAD_ERROR =
  'Не вдалося завантажити список співробітників.\nСпробуйте пізніше.';

export default function StaffPage() {
  const restaurant = useAuthStore((s) => s.restaurant);
  const refreshContext = useAuthStore((s) => s.refreshContext);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const restaurantId = restaurant?.id;

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!restaurantId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        setError(null);
        const res = await employeesApi.list(restaurantId, pageNum, PAGE_SIZE);
        setStaff((prev) => (append ? [...prev, ...res.data] : res.data));
        setHasMore(res.meta.hasMore);
        setPage(pageNum);
      } catch {
        if (!append) setStaff([]);
        setError(STAFF_LOAD_ERROR);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [restaurantId],
  );

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    void loadPage(1, false);
  }, [restaurantId, loadPage]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && restaurantId) {
        void loadPage(1, false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [restaurantId, loadPage]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPage(page + 1, true);
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadPage, page]);

  if (loading && staff.length === 0 && !error) return <PageSkeleton />;

  return (
    <div className="page">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="page-title mb-0">Персонал</h1>
        <Link to="/staff/invite" className="text-sm text-[var(--tg-link)]">
          + Запросити
        </Link>
      </div>
      {error && (
        <p className="mb-3 whitespace-pre-line rounded-lg bg-[var(--crew-red)]/10 px-3 py-2 text-sm text-[var(--crew-red)]">
          {error}
        </p>
      )}
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
      {!loading && staff.length === 0 && !error && (
        <p className="text-center text-sm text-[var(--tg-hint)]">
          У закладі ще немає співробітників
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
