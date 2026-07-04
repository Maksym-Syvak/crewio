import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { shiftsApi, scheduleApi, type RotationPreset, type ScheduleMode } from '@/api/shifts.api';
import { positionsApi } from '@/api/positions.api';
import { useAuthStore, useShiftsStore, useToastStore } from '@/store';
import { getErrorMessage } from '@/api/client';
import type { Position } from '@/types';

const singleSchema = z.object({
  position_id: z.string().min(1, 'Оберіть посаду'),
  date: z.string().min(1, 'Оберіть дату'),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  required_employees: z.number().min(1),
  is_urgent: z.boolean(),
});

type SingleForm = z.infer<typeof singleSchema>;

const WEEKDAYS = [
  { value: 0, label: 'Понеділок' },
  { value: 1, label: 'Вівторок' },
  { value: 2, label: 'Середа' },
  { value: 3, label: 'Четвер' },
  { value: 4, label: "П'ятниця" },
  { value: 5, label: 'Субота' },
  { value: 6, label: 'Неділя' },
];

const PRESETS = [
  {
    id: 'office',
    label: 'Офісний 5/2',
    mode: 'weekly' as ScheduleMode,
    weekdays: [0, 1, 2, 3, 4],
    start_time: '09:00',
    end_time: '18:00',
  },
  {
    id: '2_2',
    label: '2/2',
    mode: 'rotation' as ScheduleMode,
    preset: '2_2' as RotationPreset,
    work_days: 2,
    rest_days: 2,
    start_time: '09:00',
    end_time: '21:00',
  },
  {
    id: '3_3',
    label: '3/3',
    mode: 'rotation' as ScheduleMode,
    preset: '3_3' as RotationPreset,
    work_days: 3,
    rest_days: 3,
    start_time: '09:00',
    end_time: '21:00',
  },
  {
    id: 'barista',
    label: 'Бариста',
    mode: 'weekly' as ScheduleMode,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    start_time: '08:00',
    end_time: '16:00',
  },
  {
    id: 'waiter',
    label: 'Офіціант',
    mode: 'weekly' as ScheduleMode,
    weekdays: [4, 5, 6],
    start_time: '12:00',
    end_time: '23:00',
  },
  {
    id: 'night',
    label: 'Нічні зміни',
    mode: 'weekly' as ScheduleMode,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    start_time: '22:00',
    end_time: '06:00',
  },
];

type CreateMode = 'single' | 'template';
type TemplateKind = 'weekly' | 'rotation' | 'custom_cycle';

export default function CreateShiftPage() {
  const navigate = useNavigate();
  const restaurant = useAuthStore((s) => s.restaurant);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const push = useToastStore((s) => s.push);
  const [positions, setPositions] = useState<Position[]>([]);
  const [createMode, setCreateMode] = useState<CreateMode>('single');
  const [templateKind, setTemplateKind] = useState<TemplateKind>('weekly');
  const [positionId, setPositionId] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [requiredEmployees, setRequiredEmployees] = useState(1);
  const [rotationPreset, setRotationPreset] = useState<RotationPreset>('5_2');
  const [workDays, setWorkDays] = useState(5);
  const [restDays, setRestDays] = useState(2);
  const [generating, setGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SingleForm>({
    resolver: zodResolver(singleSchema),
    defaultValues: {
      required_employees: 1,
      is_urgent: false,
    },
  });

  useEffect(() => {
    if (restaurant) positionsApi.list(restaurant.id).then(setPositions);
  }, [restaurant]);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCreateMode('template');
    setTemplateKind(preset.mode === 'weekly' ? 'weekly' : 'rotation');
    setWeekdays(preset.weekdays ?? [0, 1, 2, 3, 4]);
    setStartTime(preset.start_time);
    setEndTime(preset.end_time);
    if (preset.preset) setRotationPreset(preset.preset);
    if (preset.work_days) setWorkDays(preset.work_days);
    if (preset.rest_days) setRestDays(preset.rest_days);
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const onSubmitSingle = async (data: SingleForm) => {
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

  const handleGenerate = async () => {
    if (!restaurant || !positionId || !dateFrom || !dateTo) {
      push({ type: 'error', title: 'Заповніть усі обовʼязкові поля' });
      return;
    }

    setGenerating(true);
    try {
      const mode: ScheduleMode =
        templateKind === 'weekly'
          ? 'weekly'
          : templateKind === 'custom_cycle'
            ? 'custom_cycle'
            : 'rotation';

      const result = await scheduleApi.generate({
        restaurant_id: restaurant.id,
        position_id: positionId,
        mode,
        date_from: dateFrom,
        date_to: dateTo,
        start_time: startTime,
        end_time: endTime,
        required_employees: requiredEmployees,
        weekdays: mode === 'weekly' ? weekdays : undefined,
        preset: mode === 'rotation' ? rotationPreset : undefined,
        work_days:
          mode === 'rotation' && rotationPreset === 'custom'
            ? workDays
            : mode === 'custom_cycle'
              ? workDays
              : undefined,
        rest_days:
          mode === 'rotation' && rotationPreset === 'custom'
            ? restDays
            : mode === 'custom_cycle'
              ? restDays
              : undefined,
      });

      await fetchShifts(restaurant.id);
      push({
        type: 'success',
        title: `Створено ${result.created} змін`,
        body: result.skipped > 0 ? `Пропущено дублікатів: ${result.skipped}` : undefined,
      });
      navigate('/calendar');
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setGenerating(false);
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
      <h1 className="page-title">Створити графік</h1>

      <div className="mb-4 flex gap-2">
        <ModeButton active={createMode === 'single'} onClick={() => setCreateMode('single')}>
          Один день
        </ModeButton>
        <ModeButton active={createMode === 'template'} onClick={() => setCreateMode('template')}>
          Шаблон
        </ModeButton>
      </div>

      {createMode === 'single' && (
        <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-4">
          <Field label="Посада" error={errors.position_id?.message}>
            <select className="field-input" {...register('position_id')}>
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
            <input type="number" min={1} className="field-input" {...register('required_employees')} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('is_urgent')} />
            Термінова зміна
          </label>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            Створити
          </button>
        </form>
      )}

      {createMode === 'template' && (
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--tg-hint)]">
              Швидкі шаблони
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rounded-full border border-[var(--crew-burgundy)]/30 px-3 py-1 text-xs"
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-[var(--crew-burgundy)]/30 px-3 py-1 text-xs"
                onClick={() => setTemplateKind('custom_cycle')}
              >
                Власний
              </button>
            </div>
          </section>

          <Field label="Посада">
            <select
              className="field-input"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            >
              <option value="">Оберіть...</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <ModeButton
              active={templateKind === 'weekly'}
              onClick={() => setTemplateKind('weekly')}
            >
              Робочий тиждень
            </ModeButton>
            <ModeButton
              active={templateKind === 'rotation'}
              onClick={() => setTemplateKind('rotation')}
            >
              Чергування
            </ModeButton>
            <ModeButton
              active={templateKind === 'custom_cycle'}
              onClick={() => setTemplateKind('custom_cycle')}
            >
              Свій цикл
            </ModeButton>
          </div>

          {templateKind === 'weekly' && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--tg-hint)]">Робочі дні:</p>
              {WEEKDAYS.map((d) => (
                <label key={d.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={weekdays.includes(d.value)}
                    onChange={() => toggleWeekday(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          )}

          {templateKind === 'rotation' && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--tg-hint)]">Тип графіка:</p>
              {(
                [
                  ['5_2', '5/2'],
                  ['2_2', '2/2'],
                  ['3_3', '3/3'],
                  ['custom', 'Власний'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="preset"
                    checked={rotationPreset === value}
                    onChange={() => setRotationPreset(value)}
                  />
                  {label}
                </label>
              ))}
              {rotationPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Працюю (днів)">
                    <input
                      type="number"
                      min={1}
                      className="field-input"
                      value={workDays}
                      onChange={(e) => setWorkDays(Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Відпочиваю (днів)">
                    <input
                      type="number"
                      min={1}
                      className="field-input"
                      value={restDays}
                      onChange={(e) => setRestDays(Number(e.target.value))}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {templateKind === 'custom_cycle' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Працюю (днів)">
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  value={workDays}
                  onChange={(e) => setWorkDays(Number(e.target.value))}
                />
              </Field>
              <Field label="Відпочиваю (днів)">
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  value={restDays}
                  onChange={(e) => setRestDays(Number(e.target.value))}
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Початок">
              <input
                type="time"
                className="field-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            <Field label="Кінець">
              <input
                type="time"
                className="field-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Від">
              <input
                type="date"
                className="field-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Field>
            <Field label="До">
              <input
                type="date"
                className="field-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Працівників на зміну">
            <input
              type="number"
              min={1}
              className="field-input"
              value={requiredEmployees}
              onChange={(e) => setRequiredEmployees(Number(e.target.value))}
            />
          </Field>

          <p className="text-xs text-[var(--tg-hint)]">
            Окремі дні можна змінити в календарі: відкрийте зміну → «Зробити вихідним» або
            «Святкова зміна».
          </p>

          <button
            type="button"
            className="btn-primary"
            disabled={generating}
            onClick={handleGenerate}
          >
            {generating ? 'Генерація...' : 'Автоматично згенерувати графік'}
          </button>
        </div>
      )}

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

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
        active
          ? 'bg-[var(--crew-burgundy)] text-white'
          : 'bg-[var(--tg-secondary-bg)] text-[var(--tg-text)]'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
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
