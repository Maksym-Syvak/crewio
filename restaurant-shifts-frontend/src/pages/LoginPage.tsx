import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { isTelegramEnv } from '@/services/telegram';
import { getPostLoginPath } from '@/store/onboarding';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const devLogin = useAuthStore((s) => s.devLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mode, setMode] = useState<'choice' | 'password'>('choice');
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [devId, setDevId] = useState('000000001');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const afterLogin = () => {
    navigate(getPostLoginPath(), { replace: true });
  };

  const handleTelegramLogin = async () => {
    try {
      await login();
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
      <div className="text-center">
        <h1 className="text-2xl font-bold">Вхід у Crewio</h1>
        <p className="mt-1 text-sm text-[var(--tg-hint)]">
          Управління змінами персоналу
        </p>
      </div>

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

      {!isLoading && mode === 'choice' && (
        <div className="w-full max-w-xs space-y-3">
          {isTelegramEnv() && (
            <button type="button" className="btn-primary" onClick={handleTelegramLogin}>
              Увійти через Telegram
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMode('password')}
          >
            Увійти через пароль
          </button>
        </div>
      )}

      {!isLoading && mode === 'password' && (
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
          <button type="button" className="btn-secondary" onClick={() => setMode('choice')}>
            Назад
          </button>
        </form>
      )}

      {!isTelegramEnv() && !isLoading && mode === 'choice' && (
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
