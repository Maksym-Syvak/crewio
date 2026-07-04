import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { ROLE_LABELS, isAdminRole } from '@/utils/roles';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const restaurant = useAuthStore((s) => s.restaurant);
  const workspaces = useAuthStore((s) => s.workspaces);
  const workspaceRole = useAuthStore((s) => s.workspaceRole);
  const activeRestaurantId = useAuthStore((s) => s.activeRestaurantId);
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  if (!restaurant || workspaces.length === 0) return null;

  const canAddRestaurant = workspaceRole === 'owner';

  return (
    <div ref={rootRef} className="relative border-b border-[var(--tg-hint)]/15 bg-[var(--tg-bg)] px-4 py-3">
      <p className="text-xs text-[var(--tg-hint)]">Поточний заклад</p>
      <button
        type="button"
        className="mt-0.5 flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate font-semibold">{restaurant.name}</span>
        <span className="text-[var(--tg-hint)]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full z-40 mt-1 overflow-hidden rounded-xl border border-[var(--tg-hint)]/15 bg-[var(--tg-bg)] shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            {workspaces.map((ws) => {
              const active = ws.restaurant.id === activeRestaurantId;
              return (
                <li key={ws.restaurant.id}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--tg-secondary-bg)] ${
                      active ? 'bg-[var(--tg-secondary-bg)]' : ''
                    }`}
                    onClick={() => {
                      void switchWorkspace(ws.restaurant.id);
                      setOpen(false);
                    }}
                  >
                    <span className="mt-0.5 text-[var(--tg-button)]">
                      {active ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {ws.restaurant.name}
                      </span>
                      <span className="text-xs text-[var(--tg-hint)]">
                        {ROLE_LABELS[ws.role]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--tg-hint)]/10 p-2">
            {canAddRestaurant && (
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--tg-link)] hover:bg-[var(--tg-secondary-bg)]"
                onClick={() => {
                  setOpen(false);
                  navigate('/restaurants/create');
                }}
              >
                + Додати заклад
              </button>
            )}
            {!canAddRestaurant && !isAdminRole(workspaceRole) && (
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--tg-link)] hover:bg-[var(--tg-secondary-bg)]"
                onClick={() => {
                  setOpen(false);
                  navigate('/join');
                }}
              >
                + Приєднатися до закладу
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
