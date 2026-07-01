import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { ROLE_LABELS, canManageStaff } from '@/utils/roles';
import { LogoutModal } from '@/components/LogoutModal';
import { clearAppSession } from '@/utils/session';
import { ONBOARDING_PATHS } from '@/store/onboarding';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try {
      await clearAppSession();
      navigate('/splash', { replace: true });
    } finally {
      setLogoutLoading(false);
      setLogoutOpen(false);
    }
  };

  const openStatistics = () => {
    navigate('/statistics');
  };

  const openStaff = () => {
    navigate('/staff');
  };

  const openJoin = () => {
    navigate(ONBOARDING_PATHS.join);
  };

  const isEmployeeWithoutVenue = user?.role === 'employee' && !employee;

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

      {isEmployeeWithoutVenue && (
        <div className="card mt-4 text-center text-sm">
          <p className="font-medium">Ви ще не підключені до закладу</p>
          <button type="button" className="btn-primary mt-3" onClick={openJoin}>
            Ввести код
          </button>
        </div>
      )}

      <dl className="card mt-6 space-y-3 text-sm">
        <Row label="Telegram ID" value={user?.telegram_id ?? '—'} />
        <Row label="Посада" value={employee?.position?.name ?? '—'} />
        <Row
          label="Бажані зміни/міс"
          value={String(employee?.desired_shifts_per_month ?? '—')}
        />
      </dl>

      <div className="mt-6 space-y-2 pb-4">
        {!isEmployeeWithoutVenue && (
          <button type="button" className="btn-secondary" onClick={openStatistics}>
            Статистика
          </button>
        )}
        {user && canManageStaff(user.role) && (
          <button type="button" className="btn-secondary" onClick={openStaff}>
            Персонал
          </button>
        )}
        <button type="button" className="btn-danger" onClick={() => setLogoutOpen(true)}>
          Вийти
        </button>
      </div>

      <LogoutModal
        open={logoutOpen}
        loading={logoutLoading}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
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
