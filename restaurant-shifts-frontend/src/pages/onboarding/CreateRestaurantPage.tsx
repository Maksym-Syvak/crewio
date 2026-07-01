import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '@/store';
import { getErrorMessage } from '@/api/client';
import type { CreateRestaurantPayload } from '@/api/restaurants.api';
import {
  ensureOnboardingProfileComplete,
  ONBOARDING_PATHS,
  useOnboardingStore,
} from '@/store/onboarding';
import {
  RESTAURANT_TYPES,
  RESTAURANT_TYPE_LABELS,
} from '@/utils/restaurant-types';

const schema = z.object({
  name: z.string().min(1, 'Вкажіть назву'),
  type: z.enum([
    'restaurant',
    'cafe',
    'bar',
    'coffee_shop',
    'fast_food',
    'pizzeria',
    'sushi',
    'hookah',
    'other',
  ]),
  address: z.string().min(1, 'Вкажіть адресу'),
  city: z.string().min(1, 'Вкажіть місто'),
  region: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Невірний email').optional().or(z.literal('')),
  website: z.string().optional(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  employees_limit: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function sanitizePayload(data: FormData): CreateRestaurantPayload {
  const rawLimit = data.employees_limit?.trim();
  const parsedLimit = rawLimit ? Number(rawLimit) : undefined;
  const employeesLimit =
    parsedLimit !== undefined && !Number.isNaN(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : undefined;

  return {
    name: data.name.trim(),
    type: data.type,
    address: data.address.trim(),
    city: data.city.trim(),
    region: data.region?.trim() || undefined,
    country: data.country?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    website: data.website?.trim() || undefined,
    open_time: data.open_time || undefined,
    close_time: data.close_time || undefined,
    employees_limit: employeesLimit,
  };
}

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const createRestaurant = useAuthStore((s) => s.createRestaurant);
  const push = useToastStore((s) => s.push);
  const setRestaurantData = useOnboardingStore((s) => s.setRestaurantData);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: 'Україна',
      employees_limit: '10',
    },
  });

  useEffect(() => {
    const hydrate = () => {
      const saved = useOnboardingStore.getState().restaurantData;
      if (!saved) return;
      reset({
        country: 'Україна',
        ...saved,
        employees_limit:
          saved.employees_limit != null
            ? String(saved.employees_limit)
            : '10',
      });
    };

    hydrate();
    return useOnboardingStore.persist.onFinishHydration(hydrate);
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    const payload = sanitizePayload(data);
    try {
      await ensureOnboardingProfileComplete();
      await createRestaurant(payload);
      setRestaurantData(payload);
      setCurrentStep('invite');
      push({ type: 'success', title: 'Заклад створено!' });
      navigate(ONBOARDING_PATHS.invite);
    } catch (e) {
      const message = getErrorMessage(e);
      if (message.includes('профіль')) {
        navigate(ONBOARDING_PATHS.profile);
      }
      push({ type: 'error', title: message });
    }
  };

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Створення закладу</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Section title="Основна інформація">
          <Field label="Назва закладу" error={errors.name?.message}>
            <input className="field-input" {...register('name')} />
          </Field>
          <Field label="Тип закладу" error={errors.type?.message}>
            <select className="field-input" {...register('type')}>
              <option value="">Оберіть...</option>
              {RESTAURANT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RESTAURANT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Адреса" error={errors.address?.message}>
            <input className="field-input" {...register('address')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Місто" error={errors.city?.message}>
              <input className="field-input" {...register('city')} />
            </Field>
            <Field label="Область">
              <input className="field-input" {...register('region')} />
            </Field>
          </div>
          <Field label="Країна">
            <input className="field-input" {...register('country')} />
          </Field>
        </Section>

        <Section title="Контакти">
          <Field label="Телефон">
            <input className="field-input" type="tel" {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input className="field-input" type="email" {...register('email')} />
          </Field>
          <Field label="Сайт">
            <input className="field-input" {...register('website')} />
          </Field>
        </Section>

        <Section title="Робочий час">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Відкриття">
              <input className="field-input" type="time" {...register('open_time')} />
            </Field>
            <Field label="Закриття">
              <input className="field-input" type="time" {...register('close_time')} />
            </Field>
          </div>
          <Field label="Кількість працівників">
            <input
              className="field-input"
              type="number"
              min={1}
              {...register('employees_limit')}
            />
          </Field>
        </Section>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          Створити заклад
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--crew-burgundy)]">{title}</h2>
      {children}
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
      <label className="mb-1 block text-sm">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--crew-crimson)]">{error}</p>}
    </div>
  );
}
