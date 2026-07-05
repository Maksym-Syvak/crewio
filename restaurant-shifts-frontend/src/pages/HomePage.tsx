import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationsStore, useShiftsStore } from '@/store';
import { ShiftCard } from '@/components/ShiftCard';
import { PageSkeleton } from '@/components/Skeleton';
import { dayjs, formatTime } from '@/utils/dates';
import { isEmployeeBooked } from '@/utils/shifts';
import type { Notification, Shift } from '@/types';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const workspaces = useAuthStore((s) => s.workspaces);
  const workspaceRole = useAuthStore((s) => s.workspaceRole);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
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
    () => shifts.filter((s) => isEmployeeBooked(s, employee?.id)),
    [shifts, employee],
  );

  const nextShift = useMemo(
    () =>
      myShifts
        .filter((s) => dayjs(s.start_time).isAfter(now))
        .sort((a, b) => dayjs(a.start_time).diff(dayjs(b.start_time)))[0],
    [myShifts, now],
  );

  const latestNotification = notifications[0] ?? null;

  if (isLoading && !shifts.length && restaurant) return <PageSkeleton />;

  if (contextLoaded && workspaces.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Привіт, {user?.first_name ?? 'користувач'} 👋</h1>
        <div className="card mt-6 text-center">
          <p className="text-lg font-medium">У вас ще немає закладів</p>
          <p className="mt-2 text-sm text-[var(--tg-hint)]">
            Створіть заклад або приєднайтесь за кодом запрошення
          </p>
          <div className="mt-4 space-y-2">
            {user?.role === 'owner' && (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => navigate('/restaurants/create')}
              >
                Додати заклад
              </button>
            )}
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => navigate('/join')}
            >
              Приєднатися до закладу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">
        Привіт, {user?.first_name ?? 'користувач'} 👋
      </h1>

      {workspaceRole === 'employee' && !employee && restaurant && (
        <div className="card mb-5 text-sm text-[var(--tg-hint)]">
          Ви переглядаєте заклад без активного профілю працівника.
        </div>
      )}

      <Section title="Наступні зміни">
        {nextShift ? (
          <ShiftCard shift={nextShift} variant="mine" />
        ) : (
          <Empty text="Немає запланованих змін" />
        )}
        <Link to="/calendar" className="mt-2 inline-block text-sm text-[var(--tg-link)]">
          Всі зміни →
        </Link>
      </Section>

      <Section title="Останнє сповіщення">
        {latestNotification ? (
          <>
            <LatestNotificationCard notification={latestNotification} shifts={shifts} />
            <Link to="/notifications" className="mt-2 inline-block text-sm text-[var(--tg-link)]">
              Всі сповіщення →
            </Link>
          </>
        ) : (
          <>
            <Empty text="Нових сповіщень немає" />
            <Link to="/notifications" className="mt-2 inline-block text-sm text-[var(--tg-link)]">
              Всі сповіщення →
            </Link>
          </>
        )}
      </Section>
    </div>
  );
}

function LatestNotificationCard({
  notification,
  shifts,
}: {
  notification: Notification;
  shifts: Shift[];
}) {
  const subtitle = getNotificationSubtitle(notification, shifts);
  const shiftId = notification.related_shift_id;

  const content = (
    <div className="card text-sm">
      <div className="font-medium">{notification.title}</div>
      {subtitle && <div className="mt-1 text-[var(--tg-hint)]">{subtitle}</div>}
    </div>
  );

  if (shiftId) {
    return (
      <Link to={`/shifts/${shiftId}`} className="block active:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}

function getNotificationSubtitle(notification: Notification, shifts: Shift[]): string | null {
  const shift = notification.related_shift_id
    ? shifts.find((s) => s.id === notification.related_shift_id)
    : undefined;

  if (shift) {
    return `${dayjs(shift.start_time).format('DD.MM')} • ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`;
  }

  const lines = notification.body.split('\n').map((l) => l.trim()).filter(Boolean);
  const dateIdx = lines.indexOf('Дата:');
  const timeIdx = lines.indexOf('Час:');
  if (dateIdx >= 0 && timeIdx >= 0) {
    const date = lines[dateIdx + 1];
    const time = lines[timeIdx + 1]?.replace('-', '–');
    if (date && time) return `${date} • ${time}`;
  }

  return dayjs(notification.created_at).format('DD.MM, HH:mm');
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
