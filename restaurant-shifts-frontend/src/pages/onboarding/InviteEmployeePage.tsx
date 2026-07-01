import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '@/store';
import { restaurantsApi } from '@/api/restaurants.api';
import { getErrorMessage } from '@/api/client';
import { RESTAURANT_TYPE_LABELS } from '@/utils/restaurant-types';
import { useOnboardingStore } from '@/store/onboarding';

export default function InviteEmployeePage() {
  const navigate = useNavigate();
  const restaurant = useAuthStore((s) => s.restaurant);
  const invitation = useAuthStore((s) => s.activeInvitation);
  const refreshInvite = useAuthStore((s) => s.refreshInvite);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    if (!restaurant || invitation) return;
    restaurantsApi.getInvite(restaurant.id).then((inv) => {
      if (inv) {
        useAuthStore.setState({ activeInvitation: inv });
      }
    });
  }, [restaurant, invitation]);

  const token = invitation?.token ?? '—';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(token);
      push({ type: 'success', title: 'Код скопійовано' });
    } catch {
      push({ type: 'error', title: 'Не вдалось скопіювати' });
    }
  };

  const shareCode = () => {
    const text = `Приєднуйся до ${restaurant?.name ?? 'закладу'} в Crewio! Код: ${token}`;
    if (navigator.share) {
      navigator.share({ title: 'Crewio', text }).catch(() => undefined);
    } else {
      copyCode();
    }
  };

  const regenerate = async () => {
    try {
      await refreshInvite();
      push({ type: 'success', title: 'Новий код створено' });
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    }
  };

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Запросити співробітників</h1>

      {restaurant && (
        <div className="card mb-4 text-sm">
          <div className="font-semibold">{restaurant.name}</div>
          <div className="text-[var(--tg-hint)]">
            {RESTAURANT_TYPE_LABELS[restaurant.type] ?? restaurant.type} ·{' '}
            {restaurant.city ?? '—'}
          </div>
        </div>
      )}

      <div className="card text-center">
        <p className="text-sm text-[var(--tg-hint)]">Код запрошення</p>
        <p className="my-3 text-2xl font-bold tracking-widest text-[var(--crew-burgundy)]">
          {token}
        </p>
        <div className="space-y-2">
          <button type="button" className="btn-primary" onClick={copyCode}>
            Скопіювати
          </button>
          <button type="button" className="btn-secondary" onClick={regenerate}>
            Створити новий
          </button>
          <button type="button" className="btn-secondary" onClick={shareCode}>
            Поділитися
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary mt-6"
        onClick={() => {
          resetOnboarding();
          navigate('/', { replace: true });
        }}
      >
        Перейти до застосунку
      </button>
    </div>
  );
}
