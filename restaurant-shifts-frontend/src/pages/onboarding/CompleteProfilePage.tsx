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

const schema = z
  .object({
    first_name: z.string().min(1, "Вкажіть ім'я"),
    last_name: z.string().min(1, 'Вкажіть прізвище'),
    phone: z.string().min(10, 'Вкажіть номер телефону'),
    password: z.string().min(6, 'Мінімум 6 символів').max(64).optional().or(z.literal('')),
    password_confirm: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.password && !data.password_confirm) return true;
      return data.password === data.password_confirm;
    },
    { message: 'Паролі не співпадають', path: ['password_confirm'] },
  );

type FormData = z.infer<typeof schema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profileData = useOnboardingStore((s) => s.profileData);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const setProfileData = useOnboardingStore((s) => s.setProfileData);
  const setPendingPassword = useOnboardingStore((s) => s.setPendingPassword);
  const markProfileSubmitted = useOnboardingStore((s) => s.markProfileSubmitted);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const needsPassword = !user?.has_password;

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
      password: '',
      password_confirm: '',
    },
  });

  useEffect(() => {
    reset({
      first_name: profileData?.first_name ?? user?.first_name ?? '',
      last_name: profileData?.last_name ?? user?.last_name ?? '',
      phone: profileData?.phone ?? user?.phone ?? '',
      password: '',
      password_confirm: '',
    });
  }, [profileData, user, reset]);

  const onSubmit = async (data: FormData) => {
    if (!selectedRole) {
      navigate(ONBOARDING_PATHS.role);
      return;
    }
    if (needsPassword && (!data.password || data.password.length < 6)) {
      return;
    }
    setProfileData({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
    });
    setPendingPassword(needsPassword ? data.password! : null);
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

        {needsPassword && (
          <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--crew-burgundy)_15%,transparent)] p-4">
            <h2 className="text-sm font-semibold text-[var(--crew-burgundy)]">
              Створіть пароль
            </h2>
            <p className="text-xs text-[var(--tg-hint)]">
              Для входу без Telegram (6–64 символи)
            </p>
            <Field label="Пароль" error={errors.password?.message}>
              <input
                className="field-input"
                type="password"
                autoComplete="new-password"
                {...register('password', { required: needsPassword })}
              />
            </Field>
            <Field label="Повторіть пароль" error={errors.password_confirm?.message}>
              <input
                className="field-input"
                type="password"
                autoComplete="new-password"
                {...register('password_confirm', { required: needsPassword })}
              />
            </Field>
          </div>
        )}

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
