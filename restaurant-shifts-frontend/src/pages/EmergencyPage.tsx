import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useShiftsStore, useToastStore } from '@/store';
import { replacementsApi } from '@/api/replacements.api';
import { ShiftCard } from '@/components/ShiftCard';
import { dayjs } from '@/utils/dates';
import { getErrorMessage } from '@/api/client';
import type { ReplacementRequest } from '@/types';

export default function EmergencyPage() {
  const navigate = useNavigate();
  const employee = useAuthStore((s) => s.employee);
  const restaurant = useAuthStore((s) => s.restaurant);
  const shifts = useShiftsStore((s) => s.shifts);
  const fetchShifts = useShiftsStore((s) => s.fetchShifts);
  const push = useToastStore((s) => s.push);
  const [requests, setRequests] = useState<ReplacementRequest[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (restaurant) fetchShifts(restaurant.id);
    replacementsApi.list().then(setRequests);
  }, [restaurant, fetchShifts]);

  const urgentShifts = useMemo(
    () => shifts.filter((s) => s.is_urgent || s.status === 'urgent'),
    [shifts],
  );

  const handleApply = async (requestId: string) => {
    if (!employee) return;
    setActing(true);
    try {
      await replacementsApi.apply(requestId, employee.id);
      push({ type: 'success', title: 'Запит надіслано адміністратору' });
      setConfirmId(null);
      setRequests(await replacementsApi.list());
    } catch (e) {
      push({ type: 'error', title: getErrorMessage(e) });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="page">
      <div className="mb-4 rounded-xl bg-[var(--crew-red)] px-4 py-3 text-white">
        <div className="font-bold">🚨 Екстрена заміна</div>
        <div className="mt-1 text-sm opacity-90">
          Потрібні працівники на термінові зміни
        </div>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Термінові зміни</h2>
        {urgentShifts.map((s) => {
          const diff = dayjs(s.start_time).diff(dayjs(), 'minute');
          const timer =
            diff > 0
              ? `${Math.floor(diff / 60)} год ${diff % 60} хв`
              : 'Скоро';

          return (
            <div key={s.id} className="mb-3">
              <ShiftCard
                shift={s}
                variant="urgent"
                onClick={() => navigate(`/shifts/${s.id}`)}
              />
              <div className="mt-1 text-xs text-[var(--crew-red)]">
                До початку: {timer}
              </div>
              <button
                type="button"
                className="btn-primary mt-2"
                disabled={acting || !employee}
                onClick={() => {
                  const req = requests.find(
                    (r) => r.shift_id === s.id && r.status === 'pending',
                  );
                  if (req) setConfirmId(req.id);
                  else navigate(`/shifts/${s.id}`);
                }}
              >
                Я можу вийти
              </button>
            </div>
          );
        })}
        {urgentShifts.length === 0 && (
          <p className="text-sm text-[var(--tg-hint)]">Немає термінових змін</p>
        )}
      </section>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--tg-bg)] p-5">
            <h3 className="font-bold">Підтвердження</h3>
            <p className="mt-2 text-sm text-[var(--tg-hint)]">
              Ви готові вийти на цю зміну? Адміністратор отримає запит.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setConfirmId(null)}
              >
                Скасувати
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={acting}
                onClick={() => handleApply(confirmId)}
              >
                Підтвердити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
