import { useEffect, useState } from 'react';
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
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setCode(inviteCode);
  }, [inviteCode]);

  useEffect(() => {
    setInviteCode(code);
  }, [code, setInviteCode]);

  const handleCheck = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setPreview(null);
    try {
      const data = await inviteApi.preview(code.trim());
      setPreview(data);
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setChecking(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await ensureOnboardingProfileComplete();
      await joinWithInvite(code.trim());
      push({ type: 'success', title: 'Ви приєднались до закладу!' });
      resetOnboarding();
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

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Приєднатися до закладу</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">
        Введіть код запрошення від адміністратора
      </p>

      <input
        className="field-input mb-3 w-full uppercase"
        placeholder="CREWIO-XXXXXX"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />

      <button
        type="button"
        className="btn-secondary mb-4"
        disabled={checking || !code.trim()}
        onClick={handleCheck}
      >
        {checking ? 'Перевірка...' : 'Перевірити код'}
      </button>

      {preview && (
        <div className="card mb-4">
          <div className="text-sm font-semibold text-[var(--crew-burgundy)]">
            Заклад знайдено
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Назва" value={preview.restaurant.name} />
            <Row
              label="Адреса"
              value={[preview.restaurant.city, preview.restaurant.address]
                .filter(Boolean)
                .join(', ')}
            />
            <Row
              label="Тип"
              value={RESTAURANT_TYPE_LABELS[preview.restaurant.type]}
            />
          </dl>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={joining}
            onClick={handleJoin}
          >
            {joining ? 'Підключення...' : 'Приєднатися'}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--tg-hint)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
