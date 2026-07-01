import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '@/store';
import { ROLE_LABELS, canManageStaff } from '@/utils/roles';
import { LogoutModal } from '@/components/LogoutModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { clearAppSession } from '@/utils/session';
import { ONBOARDING_PATHS } from '@/store/onboarding';
import { usersApi } from '@/api/users.api';
import { getErrorMessage } from '@/api/client';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = (u: typeof user) => useAuthStore.setState({ user: u });
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const push = useToastStore((s) => s.push);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try {
      await clearAppSession();
      navigate('/login', { replace: true });
    } finally {
      setLogoutLoading(false);
      setLogoutOpen(false);
    }
  };

  const handleDeleteConfirm = async (confirmDeleteRestaurant?: boolean) => {
    setDeleteLoading(true);
    try {
      await usersApi.deleteMe(confirmDeleteRestaurant);
      await clearAppSession();
      push({ type: 'success', title: 'Акаунт видалено' });
      navigate('/login', { replace: true });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  };

  const openJoin = () => navigate(ONBOARDING_PATHS.join);

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
        {restaurant && <p className="mt-1 text-sm">{restaurant.name}</p>}
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
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/statistics')}
          >
            Статистика
          </button>
        )}
        {user && canManageStaff(user.role) && (
          <button type="button" className="btn-secondary" onClick={() => navigate('/staff')}>
            Персонал
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={() => setPasswordOpen(true)}>
          {user?.has_password ? 'Змінити пароль' : 'Створити пароль'}
        </button>
        <button type="button" className="btn-danger" onClick={() => setLogoutOpen(true)}>
          Вийти
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await clearAppSession();
            navigate('/login', { replace: true });
          }}
        >
          Увійти під іншим акаунтом
        </button>
      </div>

      <button
        type="button"
        className="mt-8 w-full text-center text-xs text-[var(--crew-crimson)] underline-offset-2 hover:underline"
        onClick={() => setDeleteOpen(true)}
      >
        Видалити акаунт
      </button>

      <LogoutModal
        open={logoutOpen}
        loading={logoutLoading}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
      <DeleteAccountModal
        open={deleteOpen}
        role={user?.role ?? null}
        loading={deleteLoading}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
      <ChangePasswordModal
        open={passwordOpen}
        hasPassword={Boolean(user?.has_password)}
        onClose={() => setPasswordOpen(false)}
        onSuccess={(updated) => setUser(updated)}
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
