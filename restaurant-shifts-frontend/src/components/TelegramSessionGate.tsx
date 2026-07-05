import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { isTelegramEnv } from '@/services/telegram';
import { shouldSkipAutoAuth, isAwaitingTelegramSwitch } from '@/utils/session';

interface Props {
  children: ReactNode;
}

/** Waits for persisted auth, then re-validates Telegram session against the API. */
export function TelegramSessionGate({ children }: Props) {
  const navigate = useNavigate();
  const reconcileTelegramSession = useAuthStore((s) => s.reconcileTelegramSession);
  const telegramSessionChecked = useAuthStore((s) => s.telegramSessionChecked);
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || telegramSessionChecked) return;

    let cancelled = false;

    void (async () => {
      try {
        const result = await reconcileTelegramSession();
        if (cancelled) return;
        if (result === 'restore') {
          useAuthStore.setState({ pendingAccountRestore: true });
          navigate('/login', { replace: true });
        }
      } catch {
        if (!cancelled && !useAuthStore.getState().isAuthenticated) {
          navigate('/login', { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, navigate, reconcileTelegramSession, telegramSessionChecked]);

  const needsBootstrap =
    hydrated &&
    isTelegramEnv() &&
    !shouldSkipAutoAuth() &&
    !isAwaitingTelegramSwitch() &&
    !telegramSessionChecked;

  if (needsBootstrap) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6">
        <div className="spinner" />
        <p className="text-sm text-[var(--tg-hint)]">Вхід через Telegram...</p>
      </div>
    );
  }

  return children;
}
