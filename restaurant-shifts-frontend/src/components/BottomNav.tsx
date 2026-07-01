import { NavLink } from 'react-router-dom';
import { useNotificationsStore } from '@/store';
import { cn } from '@/utils/cn';

const items = [
  { to: '/', label: 'Головна', icon: '🏠' },
  { to: '/calendar', label: 'Календар', icon: '📅' },
  { to: '/shifts', label: 'Зміни', icon: '🕐' },
  { to: '/notifications', label: 'Сповіщення', icon: '🔔' },
  { to: '/profile', label: 'Профіль', icon: '👤' },
];

export function BottomNav() {
  const unread = useNotificationsStore((s) => s.unreadCount);

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-[color-mix(in_srgb,var(--crew-burgundy)_12%,transparent)] bg-[var(--tg-bg)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
                isActive
                  ? 'text-[var(--tg-link)]'
                  : 'text-[var(--tg-hint)]',
              )
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
            {item.to === '/notifications' && unread > 0 && (
              <span className="absolute top-1 right-[calc(50%-18px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--crew-red)] px-1 text-[10px] text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
