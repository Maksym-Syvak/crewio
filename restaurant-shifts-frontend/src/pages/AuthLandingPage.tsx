import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { isTelegramEnv } from '@/services/telegram';
import { getPostLoginPath } from '@/store/onboarding';
import { RestoreAccountModal } from '@/components/RestoreAccountModal';
import { CreateNewAccountModal } from '@/components/CreateNewAccountModal';

type View = 'landing' | 'login-existing' | 'password';

export default function AuthLandingPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const restoreAccount = useAuthStore((s) => s.restoreAccount);
  const recreateAccount = useAuthStore((s) => s.recreateAccount);
  const checkUser = useAuthStore((s) => s.checkUser);
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const devLogin = useAuthStore((s) => s.devLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const [view, setView] = useState<View>('landing');
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [devId, setDevId] = useState('000000001');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [checkedDeleted, setCheckedDeleted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isTelegramEnv() || isAuthenticated || checkedDeleted) return;

    let cancelled = false;
    (async () => {
      try {
        const status = await checkUser();
        if (cancelled) return;
        if (status.deleted && status.can_restore) {
          setRestoreOpen(true);
        }
      } catch {
        // ignore — user can choose manually
      } finally {
        if (!cancelled) setCheckedDeleted(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkUser, isAuthenticated, checkedDeleted]);

  const afterLogin = () => {
    navigate(getPostLoginPath(), { replace: true });
  };

  const handleLoginExistingTelegram = async () => {
    try {
      if (isTelegramEnv()) {
        const status = await checkUser();
        if (status.deleted && status.can_restore) {
          setRestoreOpen(true);
          return;
        }
        if (!status.exists) {
          useAuthStore.setState({
            error: 'Акаунт не знайдено. Створіть новий профіль.',
          });
          return;
        }
      }
      await login();
      afterLogin();
    } catch {
      // error in store
    }
  };

  const handleCreateNew = async () => {
    if (!isTelegramEnv()) {
      setView('login-existing');
      return;
    }

    try {
      const status = await checkUser();
      if (status.deleted && status.can_restore) {
        setRestoreOpen(true);
        return;
      }
      if (status.exists && !status.deleted) {
        useAuthStore.setState({
          error: 'Акаунт вже існує. Увійдіть у наявний профіль.',
        });
        return;
      }
      resetOnboarding();
      await register();
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithPassword(loginField.trim(), password);
      afterLogin();
    } catch {
      // error in store
    }
  };

  const handleDevLogin = async () => {
    await devLogin(devId);
    afterLogin();
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--crew-burgundy)] to-[var(--crew-burgundy-dark)] text-3xl font-bold text-white shadow-lg">
        C
      </div>

      {view === 'landing' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Ласкаво просимо до Crewio</h1>
          <p className="mt-1 text-sm text-[var(--tg-hint)]">
            Управління змінами персоналу
          </p>
        </div>
      )}

      {view === 'login-existing' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Вхід у акаунт</h1>
          <p className="mt-1 text-sm text-[var(--tg-hint)]">
            Увійдіть у наявний профіль
          </p>
        </div>
      )}

      {isLoading && (
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

      {!isLoading && view === 'landing' && (
        <div className="w-full max-w-xs space-y-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setView('login-existing')}
          >
            Увійти в існуючий акаунт
          </button>
          <button type="button" className="btn-secondary" onClick={handleCreateNew}>
            Створити новий акаунт
          </button>
        </div>
      )}

      {!isLoading && view === 'login-existing' && (
        <div className="w-full max-w-xs space-y-3">
          {isTelegramEnv() && (
            <button type="button" className="btn-primary" onClick={handleLoginExistingTelegram}>
              Увійти через Telegram
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setView('password')}
          >
            Увійти через пароль
          </button>
          <button type="button" className="btn-secondary" onClick={() => setView('landing')}>
            Назад
          </button>
        </div>
      )}

      {!isLoading && view === 'password' && (
        <form onSubmit={handlePasswordLogin} className="w-full max-w-xs space-y-3">
          <input
            className="field-input w-full"
            placeholder="Телефон або username"
            value={loginField}
            onChange={(e) => setLoginField(e.target.value)}
            autoComplete="username"
          />
          <input
            className="field-input w-full"
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" className="btn-primary" disabled={!loginField || !password}>
            Увійти
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setView('login-existing')}
          >
            Назад
          </button>
        </form>
      )}

      {!isTelegramEnv() && !isLoading && view === 'landing' && (
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
