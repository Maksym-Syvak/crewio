import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsApi, scheduleApi, type RotationPreset, type ScheduleMode } from '@/api/shifts.api';
import { useAuthStore, useShiftsStore, useToastStore } from '@/store';
import { getErrorMessage } from '@/api/client';
import { PAYMENT_TYPE_LABELS } from '@/utils/shifts';
import type { PaymentType } from '@/types';

type CreateMode = 'single' | 'template';
type TemplateKind = 'weekly' | 'rotation' | 'custom_cycle';

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
    required_employees: 3,
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
    required_employees: 3,
  },
  {
    id: '3_3',
    label: '3/3',
    mode: 'rotation' as ScheduleMode,
    preset: '3_3' as RotationPreset,
    required_employees: 3,
  },
];

export default function CreateShiftPage() {
  const navigate = useNavigate();
  const restaurant = useAuthStore((s) => s.restaurant);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const push = useToastStore((s) => s.push);

  const [createMode, setCreateMode] = useState<CreateMode>('template');
  const [templateKind, setTemplateKind] = useState<TemplateKind>('weekly');
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [requiredEmployees, setRequiredEmployees] = useState(3);
  const [shiftType, setShiftType] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('shift');
  const [shiftRate, setShiftRate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [fixedRate, setFixedRate] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [rotationPreset, setRotationPreset] = useState<RotationPreset>('5_2');
  const [workDays, setWorkDays] = useState(5);
  const [restDays, setRestDays] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCreateMode('template');
    setTemplateKind(preset.mode === 'weekly' ? 'weekly' : 'rotation');
    setWeekdays(preset.weekdays ?? [0, 1, 2, 3, 4]);
    if (preset.start_time) setStartTime(preset.start_time);
    if (preset.end_time) setEndTime(preset.end_time);
    setRequiredEmployees(preset.required_employees ?? 3);
    if (preset.preset) setRotationPreset(preset.preset);
    if (preset.work_days) setWorkDays(preset.work_days);
    if (preset.rest_days) setRestDays(preset.rest_days);
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const paymentPayload = () => {
    const base = { payment_type: paymentType };
    if (paymentType === 'hourly' && hourlyRate) {
      return { ...base, hourly_rate: Number(hourlyRate) };
    }
    if (paymentType === 'fixed' && fixedRate) {
      return { ...base, fixed_rate: Number(fixedRate) };
    }
    if (paymentType === 'shift' && shiftRate) {
      return { ...base, shift_rate: Number(shiftRate) };
    }
    return base;
  };

  const handleCreateSingle = async () => {
    if (!restaurant || !date) {
      push({ type: 'error', title: 'Заповніть дату та час' });
      return;
    }
    setSubmitting(true);
    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      await shiftsApi.create({
        restaurant_id: restaurant.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        required_employees: requiredEmployees,
        shift_type: shiftType || undefined,
        ...paymentPayload(),
        is_urgent: isUrgent,
      });
      push({ type: 'success', title: 'Зміну створено' });
      navigate('/shifts');
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!restaurant || !dateFrom || !dateTo) {
      push({ type: 'error', title: 'Заповніть період та час' });
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
        mode,
        date_from: dateFrom,
        date_to: dateTo,
        start_time: startTime,
        end_time: endTime,
        required_employees: requiredEmployees,
        shift_type: shiftType || undefined,
        ...paymentPayload(),
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
      <button type="button" className="mb-3 text-sm text-[var(--tg-link)]" onClick={() => navigate(-1)}>
        ← Назад
      </button>
      <h1 className="page-title">Створити графік</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">
        Створюйте пул доступних змін — працівники бронюють їх самостійно.
      </p>

      <div className="mb-4 flex gap-2">
        <ModeButton active={createMode === 'single'} onClick={() => setCreateMode('single')}>
          Один день
        </ModeButton>
        <ModeButton active={createMode === 'template'} onClick={() => setCreateMode('template')}>
          Шаблон
        </ModeButton>
      </div>

      <SharedFields
        startTime={startTime}
        endTime={endTime}
        requiredEmployees={requiredEmployees}
        shiftType={shiftType}
        paymentType={paymentType}
        shiftRate={shiftRate}
        hourlyRate={hourlyRate}
        fixedRate={fixedRate}
        isUrgent={isUrgent}
        showUrgent={createMode === 'single'}
        onStartTime={setStartTime}
        onEndTime={setEndTime}
        onRequired={setRequiredEmployees}
        onShiftType={setShiftType}
        onPaymentType={setPaymentType}
        onShiftRate={setShiftRate}
        onHourlyRate={setHourlyRate}
        onFixedRate={setFixedRate}
        onUrgent={setIsUrgent}
      />

      {createMode === 'single' && (
        <div className="mt-4 space-y-4">
          <Field label="Дата">
            <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <button type="button" className="btn-primary" disabled={submitting} onClick={handleCreateSingle}>
            {submitting ? '...' : 'Створити зміну'}
          </button>
        </div>
      )}

      {createMode === 'template' && (
        <div className="mt-4 space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--tg-hint)]">Швидкі шаблони</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className="preset-chip" onClick={() => applyPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <ModeButton active={templateKind === 'weekly'} onClick={() => setTemplateKind('weekly')}>
              Робочий тиждень
            </ModeButton>
            <ModeButton active={templateKind === 'rotation'} onClick={() => setTemplateKind('rotation')}>
              Чергування
            </ModeButton>
            <ModeButton active={templateKind === 'custom_cycle'} onClick={() => setTemplateKind('custom_cycle')}>
              Свій цикл
            </ModeButton>
          </div>

          {templateKind === 'weekly' && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--tg-hint)]">Робочі дні:</p>
              {WEEKDAYS.map((d) => (
                <label key={d.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={weekdays.includes(d.value)} onChange={() => toggleWeekday(d.value)} />
                  {d.label}
                </label>
              ))}
            </div>
          )}

          {templateKind === 'rotation' && (
            <div className="space-y-2">
              {(
                [
                  ['5_2', '5/2'],
                  ['2_2', '2/2'],
                  ['3_3', '3/3'],
                  ['custom', 'Власний'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="preset" checked={rotationPreset === value} onChange={() => setRotationPreset(value)} />
                  {label}
                </label>
              ))}
            </div>
          )}

          {(templateKind === 'custom_cycle' ||
            (templateKind === 'rotation' && rotationPreset === 'custom')) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Працюю (днів)">
                <input type="number" min={1} className="field-input" value={workDays} onChange={(e) => setWorkDays(Number(e.target.value))} />
              </Field>
              <Field label="Відпочиваю (днів)">
                <input type="number" min={1} className="field-input" value={restDays} onChange={(e) => setRestDays(Number(e.target.value))} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Від">
              <input type="date" className="field-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Field>
            <Field label="До">
              <input type="date" className="field-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Field>
          </div>

          <button type="button" className="btn-primary" disabled={generating} onClick={handleGenerate}>
            {generating ? 'Генерація...' : 'Згенерувати'}
          </button>
        </div>
      )}

      <style>{`
        .field-input { width: 100%; border-radius: 10px; background: var(--tg-secondary-bg); padding: 10px 12px; border: none; color: var(--tg-text); }
        .preset-chip { border-radius: 999px; border: 1px solid color-mix(in srgb, var(--crew-burgundy) 30%, transparent); padding: 4px 12px; font-size: 12px; }
      `}</style>
    </div>
  );
}

function SharedFields({
  startTime, endTime, requiredEmployees, shiftType, paymentType,
  shiftRate, hourlyRate, fixedRate, isUrgent, showUrgent,
  onStartTime, onEndTime, onRequired, onShiftType, onPaymentType,
  onShiftRate, onHourlyRate, onFixedRate, onUrgent,
}: {
  startTime: string; endTime: string; requiredEmployees: number; shiftType: string;
  paymentType: PaymentType; shiftRate: string; hourlyRate: string; fixedRate: string;
  isUrgent: boolean; showUrgent: boolean;
  onStartTime: (v: string) => void; onEndTime: (v: string) => void;
  onRequired: (v: number) => void; onShiftType: (v: string) => void;
  onPaymentType: (v: PaymentType) => void;
  onShiftRate: (v: string) => void; onHourlyRate: (v: string) => void;
  onFixedRate: (v: string) => void;
  onUrgent: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Початок">
          <input type="time" className="field-input" value={startTime} onChange={(e) => onStartTime(e.target.value)} />
        </Field>
        <Field label="Кінець">
          <input type="time" className="field-input" value={endTime} onChange={(e) => onEndTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Потрібно людей">
        <input type="number" min={1} className="field-input" value={requiredEmployees} onChange={(e) => onRequired(Number(e.target.value))} />
      </Field>
      <Field label="Тип зміни (необовʼязково)">
        <input className="field-input" placeholder="Денна, нічна..." value={shiftType} onChange={(e) => onShiftType(e.target.value)} />
      </Field>
      <Field label="Тип оплати">
        <div className="space-y-2">
          {(['shift', 'hourly', 'fixed'] as PaymentType[]).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="payment_type"
                checked={paymentType === type}
                onChange={() => onPaymentType(type)}
              />
              {PAYMENT_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </Field>
      {paymentType === 'shift' && (
        <Field label="Оплата за зміну (₴)">
          <input className="field-input" type="number" min={0} placeholder="1200" value={shiftRate} onChange={(e) => onShiftRate(e.target.value)} />
        </Field>
      )}
      {paymentType === 'hourly' && (
        <Field label="Оплата за годину (₴)">
          <input className="field-input" type="number" min={0} placeholder="150" value={hourlyRate} onChange={(e) => onHourlyRate(e.target.value)} />
        </Field>
      )}
      {paymentType === 'fixed' && (
        <Field label="Фіксована ставка за вихід (₴)">
          <input className="field-input" type="number" min={0} placeholder="500" value={fixedRate} onChange={(e) => onFixedRate(e.target.value)} />
        </Field>
      )}
      {showUrgent && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isUrgent} onChange={(e) => onUrgent(e.target.checked)} />
          Термінова зміна
        </label>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-[var(--crew-burgundy)] text-white' : 'bg-[var(--tg-secondary-bg)]'}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[var(--tg-hint)]">{label}</label>
      {children}
    </div>
  );
}
