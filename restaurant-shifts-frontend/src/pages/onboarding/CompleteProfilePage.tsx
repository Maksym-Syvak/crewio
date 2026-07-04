import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import {
  ONBOARDING_PATHS,
  ROLE_LABELS,
  useOnboardingStore,
} from '@/store/onboarding';

const schema = z.object({
  first_name: z.string().min(1, "Вкажіть ім'я"),
  last_name: z.string().min(1, 'Вкажіть прізвище'),
  phone: z.string().min(10, 'Вкажіть номер телефону'),
});

type FormData = z.infer<typeof schema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profileData = useOnboardingStore((s) => s.profileData);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const setProfileData = useOnboardingStore((s) => s.setProfileData);
  const markProfileSubmitted = useOnboardingStore((s) => s.markProfileSubmitted);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: profileData?.first_name ?? user?.first_name ?? '',
      last_name: profileData?.last_name ?? user?.last_name ?? '',
      phone: profileData?.phone ?? user?.phone ?? '',
    },
  });

  useEffect(() => {
    reset({
      first_name: profileData?.first_name ?? user?.first_name ?? '',
      last_name: profileData?.last_name ?? user?.last_name ?? '',
      phone: profileData?.phone ?? user?.phone ?? '',
    });
  }, [profileData, user, reset]);

  const onSubmit = async (data: FormData) => {
    if (!selectedRole) {
      navigate(ONBOARDING_PATHS.role);
      return;
    }
    setProfileData({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
    });
    markProfileSubmitted();

    if (selectedRole === 'employee') {
      setCurrentStep('join');
      navigate(ONBOARDING_PATHS.join);
    } else {
      setCurrentStep('create');
      navigate(ONBOARDING_PATHS.create);
    }
  };

  const roleInfo = selectedRole ? ROLE_LABELS[selectedRole] : null;

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Ваші дані</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">
        Заповніть контактну інформацію для профілю
      </p>

      {roleInfo && (
        <div className="card mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--tg-hint)]">Поточна роль</p>
            <p className="font-medium">
              {roleInfo.icon} {roleInfo.title}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-[var(--tg-link)]"
            onClick={() => navigate(ONBOARDING_PATHS.role)}
          >
            Змінити роль
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Ім'я" error={errors.first_name?.message}>
          <input className="field-input" {...register('first_name')} />
        </Field>
        <Field label="Прізвище" error={errors.last_name?.message}>
          <input className="field-input" {...register('last_name')} />
        </Field>
        <Field label="Номер телефону" error={errors.phone?.message}>
          <input
            className="field-input"
            type="tel"
            placeholder="+380..."
            {...register('phone')}
          />
        </Field>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          Продовжити
        </button>
      </form>

      <style>{`
        .field-input {
          width: 100%;
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--crew-crimson)]">{error}</p>}
    </div>
  );
}
