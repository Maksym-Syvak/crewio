import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '@/api/employees.api';
import { useAuthStore } from '@/store';
import type { Employee } from '@/types';
import { PageSkeleton } from '@/components/Skeleton';
import { formatShiftShort } from '@/utils/dates';
import {
  formatEmployeePhone,
  formatSalary,
  getEmployeeStatusLabel,
  isEmployeeActive,
  telegramDisplayName,
} from '@/utils/employees';

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
      <ul className="space-y-3">
        {staff.map((e) => (
          <EmployeeCard key={e.id} employee={e} />
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

function EmployeeCard({ employee }: { employee: Employee }) {
  const user = employee.user;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const phone = formatEmployeePhone(employee.phone, user?.phone);
  const position = employee.position?.name ?? 'Без посади';
  const statusLabel = getEmployeeStatusLabel(employee.status);
  const active = isEmployeeActive(employee.status);
  const telegram = telegramDisplayName(user?.username);
  const summary = employee.summary;

  return (
    <li className="card space-y-3">
      <div className="flex items-start gap-3">
        <Avatar photoUrl={user?.photo_url} name={user?.first_name} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{fullName || 'Без імені'}</div>
          <div className="mt-1 text-sm text-[var(--tg-hint)]">📞 {phone}</div>
          <div className="mt-0.5 text-sm">👩‍🍳 {position}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 ${
                active
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--tg-hint)]/15 text-[var(--tg-hint)]'
              }`}
            >
              {statusLabel}
            </span>
            {telegram ? (
              <span className="text-[var(--tg-link)]">{telegram}</span>
            ) : (
              <span className="text-[var(--tg-hint)]">Telegram без username</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1 border-t border-[var(--tg-hint)]/10 pt-3 text-sm">
        <Row
          label="Наступна зміна"
          value={
            summary?.next_shift_start
              ? formatShiftShort(summary.next_shift_start)
              : '—'
          }
        />
        <Row
          label="Змін цього місяця"
          value={String(summary?.booked_shifts_month ?? 0)}
        />
        <Row
          label="Очікувана зарплата"
          value={formatSalary(summary?.planned_salary ?? 0)}
        />
      </div>

      <Link
        to={`/staff/${employee.id}`}
        className="btn-secondary block text-center"
      >
        Відкрити профіль
      </Link>
    </li>
  );
}

function Avatar({ photoUrl, name }: { photoUrl?: string; name?: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--tg-button)] text-lg text-white">
      {name?.[0] ?? '?'}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--tg-hint)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
