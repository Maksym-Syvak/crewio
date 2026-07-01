import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationsStore, useShiftsStore } from '@/store';
import { ShiftCard } from '@/components/ShiftCard';
import { PageSkeleton } from '@/components/Skeleton';
import { dayjs } from '@/utils/dates';
import { ONBOARDING_PATHS } from '@/store/onboarding';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const shifts = useShiftsStore((s) => s.shifts);
  const isLoading = useShiftsStore((s) => s.isLoading);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const notifications = useNotificationsStore((s) => s.notifications);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);

  useEffect(() => {
    if (!restaurant) return;
    fetchShifts(restaurant.id, employee?.id);
    if (user) fetchNotifications(user.id);
  }, [restaurant, employee, user, fetchShifts, fetchNotifications]);

  const now = dayjs();

  const myShifts = useMemo(
    () =>
      shifts.filter((s) =>
        s.assignments?.some((a) => a.employee_id === employee?.id),
      ),
    [shifts, employee],
  );

  const nextShift = useMemo(
    () =>
      myShifts
        .filter((s) => dayjs(s.start_time).isAfter(now))
        .sort((a, b) => dayjs(a.start_time).diff(dayjs(b.start_time)))[0],
    [myShifts, now],
  );

  const available = useMemo(
    () =>
      shifts.filter(
        (s) =>
          !s.assignments?.some((a) => a.employee_id === employee?.id) &&
          (s.status === 'open' ||
            s.status === 'partially_filled' ||
            s.status === 'urgent'),
      ),
    [shifts, employee],
  );

  const urgent = useMemo(
    () => shifts.filter((s) => s.is_urgent || s.status === 'urgent'),
    [shifts],
  );

  const monthShifts = myShifts.filter((s) =>
    dayjs(s.start_time).isSame(now, 'month'),
  ).length;

  if (isLoading && !shifts.length) return <PageSkeleton />;

  if (user?.role === 'employee' && !employee) {
    return (
      <div className="page">
        <h1 className="page-title">Привіт, {user.first_name} 👋</h1>
        <div className="card mt-6 text-center">
          <p className="text-lg font-medium">Ви ще не підключені до закладу</p>
          <p className="mt-2 text-sm text-[var(--tg-hint)]">
            Отримайте код запрошення від адміністратора та приєднайтесь до
            команди
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => navigate(ONBOARDING_PATHS.join)}
          >
            Ввести код
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">
        Привіт, {user?.first_name ?? 'користувач'} 👋
      </h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Змін за місяць" value={String(monthShifts)} />
        <StatCard label="Доступно" value={String(available.length)} />
      </div>

      <Section title="Наступна зміна">
        {nextShift ? (
          <ShiftCard shift={nextShift} variant="mine" />
        ) : (
          <Empty text="Немає запланованих змін" />
        )}
      </Section>

      {urgent.length > 0 && (
        <Section title="Термінові заміни">
          {urgent.slice(0, 3).map((s) => (
            <div key={s.id} className="mb-2">
              <ShiftCard shift={s} variant="urgent" />
            </div>
          ))}
          <Link to="/emergency" className="text-sm text-[var(--tg-link)]">
            Переглянути всі →
          </Link>
        </Section>
      )}

      <Section title="Доступні зміни">
        {available.slice(0, 3).map((s) => (
          <div key={s.id} className="mb-2">
            <ShiftCard shift={s} variant="available" />
          </div>
        ))}
        {available.length === 0 && <Empty text="Немає доступних змін" />}
        <Link to="/shifts" className="mt-2 inline-block text-sm text-[var(--tg-link)]">
          Всі зміни →
        </Link>
      </Section>

      <Section title="Останні сповіщення">
        {notifications.slice(0, 3).map((n) => (
          <div key={n.id} className="card mb-2 text-sm">
            <div className="font-medium">{n.title}</div>
            <div className="text-[var(--tg-hint)]">{n.body}</div>
          </div>
        ))}
        {notifications.length === 0 && <Empty text="Немає сповіщень" />}
      </Section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-[var(--tg-hint)]">{label}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-[var(--tg-secondary-bg)] p-4 text-center text-sm text-[var(--tg-hint)]">
      {text}
    </p>
  );
}
