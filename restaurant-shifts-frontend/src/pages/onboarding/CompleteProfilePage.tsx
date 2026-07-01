import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store';
import { getErrorMessage } from '@/api/client';

const schema = z.object({
  first_name: z.string().min(1, "Вкажіть ім'я"),
  last_name: z.string().min(1, 'Вкажіть прізвище'),
  phone: z.string().min(10, 'Вкажіть номер телефону'),
});

type FormData = z.infer<typeof schema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const completeProfile = useAuthStore((s) => s.completeProfile);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const push = useToastStore((s) => s.push);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!selectedRole) {
      navigate('/onboarding/role');
      return;
    }
    try {
      await completeProfile({
        ...data,
        role: selectedRole,
      });
      if (selectedRole === 'employee') {
        navigate('/onboarding/join');
      } else {
        navigate('/onboarding/create-restaurant');
      }
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    }
  };

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Ваші дані</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">
        Заповніть контактну інформацію для профілю
      </p>

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
