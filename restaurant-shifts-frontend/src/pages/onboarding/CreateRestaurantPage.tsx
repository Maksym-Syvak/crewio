import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '@/store';
import { getErrorMessage } from '@/api/client';
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
  employees_limit: z.number().min(1).optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const createRestaurant = useAuthStore((s) => s.createRestaurant);
  const push = useToastStore((s) => s.push);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Україна', employees_limit: 10 },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createRestaurant(data);
      push({ type: 'success', title: 'Заклад створено!' });
      navigate('/onboarding/invite');
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
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
              {...register('employees_limit', { valueAsNumber: true })}
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
