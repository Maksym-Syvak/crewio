import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { ROLE_LABELS, canManageStaff } from '@/utils/roles';
import { isTelegramEnv } from '@/services/telegram';
import { markLoggedOut } from '@/utils/session';
import { disconnectSocket } from '@/sockets/events';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const logout = useAuthStore((s) => s.logout);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const handleLogout = () => {
    markLoggedOut();
    resetOnboarding();
    disconnectSocket();
    logout();

    const tg = window.Telegram?.WebApp;
    if (isTelegramEnv() && tg?.close) {
      tg.close();
      return;
    }

    navigate('/splash', { replace: true });
  };

  const openStatistics = () => {
    navigate('/statistics');
  };

  const openStaff = () => {
    navigate('/staff');
  };

  return (
    <div className="page">
      <div className="flex flex-col items-center text-center">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--tg-button)] text-2xl text-white">
            {user?.first_name?.[0] ?? '?'}
          </div>
        )}
        <h1 className="mt-3 text-xl font-bold">
          {user?.first_name} {user?.last_name}
        </h1>
        <p className="text-sm text-[var(--tg-hint)]">
          {user ? ROLE_LABELS[user.role] : ''}
        </p>
        {restaurant && (
          <p className="mt-1 text-sm">{restaurant.name}</p>
        )}
      </div>

      <dl className="card mt-6 space-y-3 text-sm">
        <Row label="Telegram ID" value={user?.telegram_id ?? '—'} />
        <Row label="Посада" value={employee?.position?.name ?? '—'} />
        <Row
          label="Бажані зміни/міс"
          value={String(employee?.desired_shifts_per_month ?? '—')}
        />
      </dl>

      <div className="mt-6 space-y-2 pb-4">
        <button type="button" className="btn-secondary" onClick={openStatistics}>
          Статистика
        </button>
        {user && canManageStaff(user.role) && (
          <button type="button" className="btn-secondary" onClick={openStaff}>
            Персонал
          </button>
        )}
        <button type="button" className="btn-danger" onClick={handleLogout}>
          Вийти
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--tg-hint)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
