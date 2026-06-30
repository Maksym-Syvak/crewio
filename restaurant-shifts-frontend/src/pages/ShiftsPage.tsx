import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useShiftsStore } from '@/store';
import { ShiftCard } from '@/components/ShiftCard';
import { PageSkeleton } from '@/components/Skeleton';
import type { Shift } from '@/types';

type SortKey = 'date_asc' | 'date_desc' | 'pay_desc';

export default function ShiftsPage() {
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const user = useAuthStore((s) => s.user);
  const shifts = useShiftsStore((s) => s.shifts);
  const isLoading = useShiftsStore((s) => s.isLoading);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [positionId, setPositionId] = useState('');
  const [sort, setSort] = useState<SortKey>('date_asc');

  useEffect(() => {
    if (restaurant) fetchShifts(restaurant.id);
  }, [restaurant, fetchShifts]);

  const positions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shifts) {
      if (s.position) map.set(s.position.id, s.position.name);
    }
    return [...map.entries()];
  }, [shifts]);

  const filtered = useMemo(() => {
    let list = [...shifts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.position?.name.toLowerCase().includes(q) ||
          s.restaurant?.name.toLowerCase().includes(q),
      );
    }
    if (status) list = list.filter((s) => s.status === status);
    if (positionId) list = list.filter((s) => s.position_id === positionId);

    list.sort((a, b) => {
      if (sort === 'date_asc')
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      if (sort === 'date_desc')
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      const payA = a.position?.shift_rate ?? a.position?.hourly_rate ?? 0;
      const payB = b.position?.shift_rate ?? b.position?.hourly_rate ?? 0;
      return payB - payA;
    });

    return list;
  }, [shifts, search, status, positionId, sort]);

  const getVariant = (s: Shift) => {
    if (s.is_urgent || s.status === 'urgent') return 'urgent' as const;
    if (s.assignments?.some((a) => a.employee_id === employee?.id))
      return 'mine' as const;
    return 'available' as const;
  };

  if (isLoading && !shifts.length) return <PageSkeleton />;

  return (
    <div className="page">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="page-title mb-0">Зміни</h1>
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <Link to="/shifts/create" className="text-sm text-[var(--tg-link)]">
            + Створити
          </Link>
        )}
      </div>

      <input
        className="mb-3 w-full rounded-lg bg-[var(--tg-secondary-bg)] px-3 py-2 text-sm outline-none"
        placeholder="Пошук..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <select
          className="rounded-lg bg-[var(--tg-secondary-bg)] px-2 py-1.5 text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Всі статуси</option>
          <option value="open">Відкрита</option>
          <option value="partially_filled">Частково</option>
          <option value="urgent">Термінова</option>
        </select>
        <select
          className="rounded-lg bg-[var(--tg-secondary-bg)] px-2 py-1.5 text-xs"
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
        >
          <option value="">Всі посади</option>
          {positions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg bg-[var(--tg-secondary-bg)] px-2 py-1.5 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="date_asc">Дата ↑</option>
          <option value="date_desc">Дата ↓</option>
          <option value="pay_desc">Оплата ↓</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <ShiftCard key={s.id} shift={s} variant={getVariant(s)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[var(--tg-hint)]">
            Змін не знайдено
          </p>
        )}
      </div>
    </div>
  );
}
