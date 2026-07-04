import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useShiftsStore } from '@/store';
import { ShiftCard } from '@/components/ShiftCard';
import { PageSkeleton } from '@/components/Skeleton';
import type { Shift } from '@/types';
import { isAdminRole } from '@/utils/roles';
import {
  getAvailableSlots,
  isEmployeeBooked,
  isShiftFull,
} from '@/utils/shifts';

type Tab = 'available' | 'mine' | 'all';
type SortKey = 'date_asc' | 'date_desc';

export default function ShiftsPage() {
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const user = useAuthStore((s) => s.user);
  const shifts = useShiftsStore((s) => s.shifts);
  const isLoading = useShiftsStore((s) => s.isLoading);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);

  const isAdmin = Boolean(user && isAdminRole(user.role));
  const [tab, setTab] = useState<Tab>(isAdmin ? 'all' : 'available');
  const [sort, setSort] = useState<SortKey>('date_asc');

  useEffect(() => {
    if (restaurant) fetchShifts(restaurant.id);
  }, [restaurant, fetchShifts]);

  const filtered = useMemo(() => {
    let list = [...shifts];

    if (tab === 'available') {
      list = list.filter((s) => !isShiftFull(s) && s.status !== 'cancelled');
    } else if (tab === 'mine') {
      list = list.filter((s) => isEmployeeBooked(s, employee?.id));
    }

    list.sort((a, b) => {
      const ta = new Date(a.start_time).getTime();
      const tb = new Date(b.start_time).getTime();
      return sort === 'date_asc' ? ta - tb : tb - ta;
    });

    return list;
  }, [shifts, tab, sort, employee?.id]);

  const getVariant = (s: Shift) => {
    if (s.is_urgent || s.status === 'urgent') return 'urgent' as const;
    if (isEmployeeBooked(s, employee?.id)) return 'mine' as const;
    if (getAvailableSlots(s) === 0) return 'dayoff' as const;
    return 'available' as const;
  };

  if (isLoading && !shifts.length) return <PageSkeleton />;

  return (
    <div className="page">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="page-title mb-0">Зміни</h1>
        {isAdmin && (
          <Link to="/shifts/create" className="text-sm text-[var(--tg-link)]">
            + Створити
          </Link>
        )}
      </div>

      {!isAdmin && (
        <p className="mb-3 text-sm text-[var(--tg-hint)]">
          Оберіть вільну зміну та забронюйте її самостійно.
        </p>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {!isAdmin && (
          <>
            <TabButton active={tab === 'available'} onClick={() => setTab('available')}>
              Доступні
            </TabButton>
            <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
              Мої
            </TabButton>
          </>
        )}
        {isAdmin && (
          <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
            Усі
          </TabButton>
        )}
        <select
          className="rounded-lg bg-[var(--tg-secondary-bg)] px-2 py-1.5 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="date_asc">Дата ↑</option>
          <option value="date_desc">Дата ↓</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <ShiftCard key={s.id} shift={s} variant={getVariant(s)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[var(--tg-hint)]">
            {tab === 'available' ? 'Немає доступних змін' : 'Змін не знайдено'}
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rounded-lg px-3 py-1.5 text-xs ${active ? 'bg-[var(--crew-burgundy)] text-white' : 'bg-[var(--tg-secondary-bg)]'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
