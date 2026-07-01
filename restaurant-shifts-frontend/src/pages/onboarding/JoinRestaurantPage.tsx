import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '@/store';
import { inviteApi } from '@/api/restaurants.api';
import { getErrorMessage } from '@/api/client';
import { RESTAURANT_TYPE_LABELS } from '@/utils/restaurant-types';
import {
  ensureOnboardingProfileComplete,
  ONBOARDING_PATHS,
  useOnboardingStore,
} from '@/store/onboarding';
import type { InvitePreview } from '@/types';

export default function JoinRestaurantPage() {
  const navigate = useNavigate();
  const joinWithInvite = useAuthStore((s) => s.joinWithInvite);
  const push = useToastStore((s) => s.push);
  const inviteCode = useOnboardingStore((s) => s.inviteCode);
  const setInviteCode = useOnboardingStore((s) => s.setInviteCode);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const [code, setCode] = useState(inviteCode);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleConnect = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setInviteCode(trimmed);
    setLoading(true);
    setPreview(null);
    try {
      const data = await inviteApi.preview(trimmed);
      setPreview(data);
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setJoining(true);
    try {
      await ensureOnboardingProfileComplete();
      await joinWithInvite(trimmed);
      resetOnboarding();
      push({ type: 'success', title: 'Ви приєднались до закладу!' });
      navigate('/', { replace: true });
    } catch (e) {
      const message = getErrorMessage(e);
      if (message.includes('профіль')) {
        navigate(ONBOARDING_PATHS.profile);
      }
      push({ type: 'error', title: message });
    } finally {
      setJoining(false);
    }
  };

  const typeLabel = preview
    ? RESTAURANT_TYPE_LABELS[preview.restaurant.type]
    : '';

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Приєднання до закладу</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">
        Введіть код запрошення від адміністратора закладу
      </p>

      {!preview ? (
        <>
          <label className="mb-1 block text-sm font-medium">
            Код запрошення
          </label>
          <input
            className="field-input mb-4 w-full uppercase"
            placeholder="CREWIO-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={loading || !code.trim()}
            onClick={handleConnect}
          >
            {loading ? 'Перевірка...' : 'Приєднатися'}
          </button>
        </>
      ) : (
        <div className="card">
          <p className="text-sm font-semibold text-[var(--crew-burgundy)]">
            Заклад знайдено
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-lg font-bold">
              🍽 {preview.restaurant.name}
            </p>
            <p className="text-[var(--tg-hint)]">
              📍{' '}
              {[preview.restaurant.city, preview.restaurant.address]
                .filter(Boolean)
                .join(', ')}
            </p>
            {preview.restaurant.phone && (
              <p className="text-[var(--tg-hint)]">
                📞 {preview.restaurant.phone}
              </p>
            )}
            {typeLabel && (
              <p className="text-[var(--tg-hint)]">🏷 {typeLabel}</p>
            )}
          </div>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              className="btn-primary"
              disabled={joining}
              onClick={handleConfirmJoin}
            >
              {joining ? 'Підключення...' : 'Підтвердити приєднання'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={joining}
              onClick={() => setPreview(null)}
            >
              Інший код
            </button>
          </div>
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
