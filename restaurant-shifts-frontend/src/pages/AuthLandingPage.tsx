import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { isTelegramEnv } from '@/services/telegram';
import { getPostLoginPath } from '@/store/onboarding';
import { RestoreAccountModal } from '@/components/RestoreAccountModal';
import { CreateNewAccountModal } from '@/components/CreateNewAccountModal';
import { ConnectionErrorScreen } from '@/components/ConnectionErrorScreen';
import { hasActiveWorkspace } from '@/utils/workspace';
import {
  beginFreshTelegramAuth,
  isAwaitingTelegramSwitch,
  shouldSkipAutoAuth,
} from '@/utils/session';

export default function AuthLandingPage() {
  const navigate = useNavigate();
  const telegramAutoAuth = useAuthStore((s) => s.telegramAutoAuth);
  const restoreAccount = useAuthStore((s) => s.restoreAccount);
  const recreateAccount = useAuthStore((s) => s.recreateAccount);
  const devLogin = useAuthStore((s) => s.devLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const contextLoadError = useAuthStore((s) => s.contextLoadError);
  const contextLoadInProgress = useAuthStore((s) => s.contextLoadInProgress);
  const retryLoadContext = useAuthStore((s) => s.retryLoadContext);
  const restaurant = useAuthStore((s) => s.restaurant);
  const activeRestaurantId = useAuthStore((s) => s.activeRestaurantId);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const pendingAccountRestore = useAuthStore((s) => s.pendingAccountRestore);
  const clearPendingAccountRestore = useAuthStore((s) => s.clearPendingAccountRestore);
  const telegramSessionChecked = useAuthStore((s) => s.telegramSessionChecked);

  const [devId, setDevId] = useState('000000001');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const skipAutoAuth = shouldSkipAutoAuth();

  useEffect(() => {
    if (pendingAccountRestore) {
      setRestoreOpen(true);
      clearPendingAccountRestore();
    }
  }, [clearPendingAccountRestore, pendingAccountRestore]);

  useEffect(() => {
    if (isAwaitingTelegramSwitch()) {
      navigate('/login/switch-telegram', { replace: true });
    }
  }, [navigate]);

  const canEnterApp =
    contextLoaded || hasActiveWorkspace(restaurant, activeRestaurantId);

  useEffect(() => {
    if (isAuthenticated && canEnterApp) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [isAuthenticated, canEnterApp, navigate]);

  const afterLogin = () => {
    navigate(getPostLoginPath(), { replace: true });
  };

  const handleManualLogin = async () => {
    beginFreshTelegramAuth();
    try {
      const result = await telegramAutoAuth();
      if (result === 'restore') {
        setRestoreOpen(true);
        return;
      }
      afterLogin();
    } catch {
      // error in store
    }
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
    beginFreshTelegramAuth();
    await devLogin(devId);
    afterLogin();
  };

  const showTelegramLoading =
    isTelegramEnv() &&
    !isAuthenticated &&
    !skipAutoAuth &&
    !isAwaitingTelegramSwitch() &&
    (!telegramSessionChecked || isLoading);

  const showRestoringSession =
    isAuthenticated && !canEnterApp && !skipAutoAuth;

  const showConnectionError =
    isAuthenticated &&
    contextLoaded &&
    contextLoadError &&
    !hasActiveWorkspace(restaurant, activeRestaurantId) &&
    !skipAutoAuth;

  const showManualLogin =
    isTelegramEnv() &&
    !isAuthenticated &&
    skipAutoAuth &&
    !isLoading &&
    !isAwaitingTelegramSwitch();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--crew-burgundy)] to-[var(--crew-burgundy-dark)] text-3xl font-bold text-white shadow-lg">
        C
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold">Ласкаво просимо до Crewio</h1>
        <p className="mt-1 text-sm text-[var(--tg-hint)]">
          {showTelegramLoading
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

      {showRestoringSession && (
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-[var(--tg-hint)]">Завантаження...</p>
        </div>
      )}

      {showConnectionError && (
        <ConnectionErrorScreen
          onRetry={() => void retryLoadContext()}
          retrying={contextLoadInProgress}
        />
      )}

      {error && !isLoading && (
        <p className="max-w-xs whitespace-pre-line text-center text-sm text-[var(--crew-crimson)]">
          {error}
        </p>
      )}

      {showManualLogin && (
        <div className="w-full max-w-xs space-y-3">
          <p className="text-center text-sm text-[var(--tg-hint)]">
            Ви вийшли з акаунта Crewio. Увійдіть знову через Telegram.
          </p>
          <button type="button" className="btn-primary" onClick={handleManualLogin}>
            Увійти через Telegram
          </button>
        </div>
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
