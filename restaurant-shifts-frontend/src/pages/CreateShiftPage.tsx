import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { shiftsApi } from '@/api/shifts.api';
import { positionsApi } from '@/api/positions.api';
import { useAuthStore, useToastStore } from '@/store';
import { getErrorMessage } from '@/api/client';
import type { Position } from '@/types';
import { useState } from 'react';

const schema = z.object({
  position_id: z.string().min(1, 'Оберіть посаду'),
  date: z.string().min(1, 'Оберіть дату'),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  required_employees: z.number().min(1),
  is_urgent: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CreateShiftPage() {
  const navigate = useNavigate();
  const restaurant = useAuthStore((s) => s.restaurant);
  const push = useToastStore((s) => s.push);
  const [positions, setPositions] = useState<Position[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      required_employees: 1,
      is_urgent: false,
    },
  });

  useEffect(() => {
    if (restaurant) positionsApi.list(restaurant.id).then(setPositions);
  }, [restaurant]);

  const onSubmit = async (data: FormData) => {
    if (!restaurant) return;
    try {
      const start = new Date(`${data.date}T${data.start_time}`);
      const end = new Date(`${data.date}T${data.end_time}`);
      await shiftsApi.create({
        restaurant_id: restaurant.id,
        position_id: data.position_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        required_employees: data.required_employees,
        is_urgent: data.is_urgent,
      });
      push({ type: 'success', title: 'Зміну створено' });
      navigate('/shifts');
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    }
  };

  return (
    <div className="page">
      <button
        type="button"
        className="mb-3 text-sm text-[var(--tg-link)]"
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>
      <h1 className="page-title">Нова зміна</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Посада" error={errors.position_id?.message}>
          <select
            className="field-input"
            {...register('position_id')}
          >
            <option value="">Оберіть...</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Дата" error={errors.date?.message}>
          <input type="date" className="field-input" {...register('date')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Початок" error={errors.start_time?.message}>
            <input type="time" className="field-input" {...register('start_time')} />
          </Field>
          <Field label="Кінець" error={errors.end_time?.message}>
            <input type="time" className="field-input" {...register('end_time')} />
          </Field>
        </div>

        <Field label="Кількість працівників" error={errors.required_employees?.message}>
          <input
            type="number"
            min={1}
            className="field-input"
            {...register('required_employees')}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('is_urgent')} />
          Термінова зміна
        </label>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          Створити
        </button>
      </form>

      <style>{`
        .field-input {
          width: 100%;
          border-radius: 10px;
          background: var(--tg-secondary-bg);
          padding: 10px 12px;
          border: none;
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[var(--tg-hint)]">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--crew-red)]">{error}</p>}
    </div>
  );
}
