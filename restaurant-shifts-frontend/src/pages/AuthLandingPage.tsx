import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { isTelegramEnv } from '@/services/telegram';
import { getPostLoginPath } from '@/store/onboarding';
import { RestoreAccountModal } from '@/components/RestoreAccountModal';
import { CreateNewAccountModal } from '@/components/CreateNewAccountModal';

export default function AuthLandingPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const restoreAccount = useAuthStore((s) => s.restoreAccount);
  const recreateAccount = useAuthStore((s) => s.recreateAccount);
  const checkUser = useAuthStore((s) => s.checkUser);
  const devLogin = useAuthStore((s) => s.devLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const [devId, setDevId] = useState('000000001');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [autoAuthStarted, setAutoAuthStarted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isTelegramEnv() || isAuthenticated || autoAuthStarted) return;

    let cancelled = false;
    setAutoAuthStarted(true);

    (async () => {
      try {
        const status = await checkUser();
        if (cancelled) return;

        if (status.deleted && status.can_restore) {
          setRestoreOpen(true);
          return;
        }

        if (status.exists) {
          await login();
          if (!cancelled) navigate(getPostLoginPath(), { replace: true });
          return;
        }

        resetOnboarding();
        await register();
        if (!cancelled) navigate(getPostLoginPath(), { replace: true });
      } catch {
        // user can retry manually in dev mode
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    autoAuthStarted,
    checkUser,
    isAuthenticated,
    login,
    navigate,
    register,
    resetOnboarding,
  ]);

  const afterLogin = () => {
    navigate(getPostLoginPath(), { replace: true });
  };

  const handleRestore = async () => {
    try {
      await restoreAccount();
      setRestoreOpen(false);
      afterLogin();
    } catch {
      // error in store
    }
  };

  const handleConfirmCreateNew = async () => {
    try {
      resetOnboarding();
      await recreateAccount();
      setCreateNewOpen(false);
      setRestoreOpen(false);
      afterLogin();
    } catch {
      // error in store
    }
  };

  const handleDevLogin = async () => {
    await devLogin(devId);
    afterLogin();
  };

  const showTelegramLoading = isTelegramEnv() && !isAuthenticated && (isLoading || !error);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--crew-burgundy)] to-[var(--crew-burgundy-dark)] text-3xl font-bold text-white shadow-lg">
        C
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold">Ласкаво просимо до Crewio</h1>
        <p className="mt-1 text-sm text-[var(--tg-hint)]">
          {isTelegramEnv()
            ? 'Вхід через Telegram...'
            : 'Управління змінами персоналу'}
        </p>
      </div>

      {showTelegramLoading && (
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-[var(--tg-hint)]">Авторизація...</p>
        </div>
      )}

      {error && !isLoading && (
        <p className="max-w-xs text-center text-sm text-[var(--crew-crimson)]">
          {error}
        </p>
      )}

      {!isTelegramEnv() && !isLoading && (
        <div className="w-full max-w-xs space-y-3 border-t border-[var(--tg-hint)]/20 pt-4">
          <p className="text-center text-xs text-[var(--tg-hint)]">Режим розробки</p>
          <input
            className="field-input w-full"
            value={devId}
            onChange={(e) => setDevId(e.target.value)}
            placeholder="telegram_id"
          />
          <button type="button" className="btn-secondary" onClick={handleDevLogin}>
            Dev login
          </button>
        </div>
      )}

      <RestoreAccountModal
        open={restoreOpen}
        loading={isLoading}
        onRestore={handleRestore}
        onCreateNew={() => {
          setRestoreOpen(false);
          setCreateNewOpen(true);
        }}
        onCancel={() => setRestoreOpen(false)}
      />

      <CreateNewAccountModal
        open={createNewOpen}
        loading={isLoading}
        onConfirm={handleConfirmCreateNew}
        onCancel={() => setCreateNewOpen(false)}
      />

      <style>{`
        .field-input {
          border-radius: 10px;
          background: var(--tg-secondary-bg);
          padding: 12px;
          border: 1px solid color-mix(in srgb, var(--crew-burgundy) 15%, transparent);
          color: var(--tg-text);
        }
      `}</style>
    </div>
  );
}
