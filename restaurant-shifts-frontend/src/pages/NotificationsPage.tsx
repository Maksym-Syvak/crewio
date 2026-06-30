import { useEffect } from 'react';
import { useAuthStore, useNotificationsStore } from '@/store';
import { dayjs } from '@/utils/dates';

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const notifications = useNotificationsStore((s) => s.notifications);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);
  const markRead = useNotificationsStore((s) => s.markRead);

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user, fetchNotifications]);

  if (!notifications.length && user) {
    return (
      <div className="page">
        <h1 className="page-title">Сповіщення</h1>
        <p className="text-center text-sm text-[var(--tg-hint)]">
          Немає повідомлень
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Сповіщення</h1>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`card ${n.status === 'unread' ? 'ring-1 ring-[var(--tg-link)]/30' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="mt-1 text-sm text-[var(--tg-hint)]">{n.body}</div>
                <div className="mt-2 text-xs text-[var(--tg-hint)]">
                  {dayjs(n.created_at).format('D MMM, HH:mm')}
                </div>
              </div>
              {n.status === 'unread' && (
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--tg-link)]"
                  onClick={() => markRead(n.id)}
                >
                  Прочитано
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
