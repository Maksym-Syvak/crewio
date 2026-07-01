import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { isTelegramEnv } from '@/services/telegram';
import { getPostLoginPath } from '@/store/onboarding';

export default function SplashPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const devLogin = useAuthStore((s) => s.devLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [devId, setDevId] = useState('000000001');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isTelegramEnv()) return;
    login()
      .then(() => {
        navigate(getPostLoginPath(), { replace: true });
      })
      .catch(() => undefined);
  }, [login, navigate]);

  const handleDevLogin = async () => {
    await devLogin(devId);
    navigate(getPostLoginPath(), { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--crew-burgundy)] to-[var(--crew-burgundy-dark)] text-3xl font-bold text-white shadow-lg">
        C
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Crewio</h1>
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

      {error && (
        <p className="max-w-xs text-center text-sm text-[var(--crew-crimson)]">
          {error}
        </p>
      )}

      {!isTelegramEnv() && !isLoading && (
        <div className="w-full max-w-xs space-y-3">
          <p className="text-center text-xs text-[var(--tg-hint)]">
            Режим розробки (поза Telegram)
          </p>
          <input
            className="w-full rounded-lg border border-[var(--tg-hint)]/30 bg-[var(--tg-secondary-bg)] px-3 py-2 text-sm"
            value={devId}
            onChange={(e) => setDevId(e.target.value)}
            placeholder="telegram_id"
          />
          <button type="button" className="btn-primary" onClick={handleDevLogin}>
            Увійти (dev)
          </button>
        </div>
      )}
    </div>
  );
}
