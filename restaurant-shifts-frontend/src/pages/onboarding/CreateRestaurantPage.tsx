import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

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
  address: z.string().optional(),
  city: z.string().min(1, 'Вкажіть місто'),
  region: z.string().min(1, 'Вкажіть область'),
  country: z.string().min(1, 'Вкажіть країну'),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((value) => !value || value === '' || z.string().email().safeParse(value).success, {
      message: 'Невірний email',
    }),
  website: z.string().optional(),
  open_time: z.string().min(1, 'Вкажіть час відкриття'),
  close_time: z.string().min(1, 'Вкажіть час закриття'),
  employees_limit: z.string().min(1, 'Вкажіть кількість працівників'),
});

type FormData = z.infer<typeof schema>;

function sanitizePayload(data: FormData): CreateRestaurantPayload {
  const rawLimit = data.employees_limit.trim();
  const parsedLimit = Number(rawLimit);
  const employeesLimit =
    !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

  return {
    name: data.name.trim(),
    type: data.type,
    address: data.address?.trim() || '',
    city: data.city.trim(),
    region: data.region.trim(),
    country: data.country.trim(),
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    website: data.website?.trim() || undefined,
    open_time: data.open_time,
    close_time: data.close_time,
    employees_limit: employeesLimit,
  };
}

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAppFlow = location.pathname.includes('/restaurants/create');
  const keyboardInset = useKeyboardInset();
  const user = useAuthStore((s) => s.user);
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
      open_time: '09:00',
      close_time: '22:00',
    },
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.disableVerticalSwipes?.();
    return () => tg?.enableVerticalSwipes?.();
  }, []);

  useEffect(() => {
    const hydrate = () => {
      const saved = useOnboardingStore.getState().restaurantData;
      if (!saved) return;
      reset({
        country: 'Україна',
        open_time: '09:00',
        close_time: '22:00',
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
      if (!user?.is_profile_completed) {
        await ensureOnboardingProfileComplete();
      }
      await createRestaurant(payload);
      setRestaurantData(payload);

      if (isAppFlow) {
        push({ type: 'success', title: 'Заклад додано!' });
        navigate('/', { replace: true });
        return;
      }

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

  const submitLabel = isAppFlow ? 'Додати заклад' : 'Створити заклад';
  const bottomInset = isAppFlow ? 96 : 24;

  return (
    <div
      className={`create-restaurant-page${isAppFlow ? ' create-restaurant-page--app' : ''}`}
      style={{
        paddingBottom: `calc(${bottomInset}px + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
      }}
    >
      <h1 className="page-title">Створення закладу</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="create-restaurant-form space-y-4">
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
          <Field label="Адреса">
            <input className="field-input" {...register('address')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Місто" error={errors.city?.message}>
              <input className="field-input" {...register('city')} />
            </Field>
            <Field label="Область" error={errors.region?.message}>
              <input className="field-input" {...register('region')} />
            </Field>
          </div>
          <Field label="Країна" error={errors.country?.message}>
            <input className="field-input" {...register('country')} />
          </Field>
        </Section>

        <Section title="Контакти">
          <Field label="Телефон (необов'язково)">
            <input className="field-input" type="tel" {...register('phone')} />
          </Field>
          <Field label="Email (необов'язково)" error={errors.email?.message}>
            <input className="field-input" type="email" {...register('email')} />
          </Field>
          <Field label="Сайт (необов'язково)">
            <input className="field-input" {...register('website')} />
          </Field>
        </Section>

        <Section title="Робочий час">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Відкриття" error={errors.open_time?.message}>
              <input className="field-input" type="time" {...register('open_time')} />
            </Field>
            <Field label="Закриття" error={errors.close_time?.message}>
              <input className="field-input" type="time" {...register('close_time')} />
            </Field>
          </div>
          <Field
            label="Кількість працівників"
            error={errors.employees_limit?.message}
          >
            <input
              className="field-input"
              type="number"
              min={1}
              inputMode="numeric"
              {...register('employees_limit')}
            />
          </Field>
        </Section>

        <button
          type="submit"
          className="btn-primary create-restaurant-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '...' : submitLabel}
        </button>
      </form>
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
    <div className="create-restaurant-field">
      <label className="mb-1 block text-sm">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--crew-crimson)]">{error}</p>}
    </div>
  );
}
