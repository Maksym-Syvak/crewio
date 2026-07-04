import { closeTelegramApp, reloadApp } from '@/services/telegram';
import { clearTelegramSwitchFlag } from '@/utils/session';

const STEPS = [
  'Закрийте Crewio.',
  'Перемкніть акаунт у Telegram.',
  'Відкрийте Crewio повторно.',
];

export default function SwitchTelegramAccountPage() {
  const handleReload = () => {
    clearTelegramSwitchFlag();
    reloadApp();
  };

  const handleClose = () => {
    closeTelegramApp();
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--crew-burgundy)] to-[var(--crew-burgundy-dark)] text-3xl font-bold text-white shadow-lg">
        C
      </div>

      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold">Змінити Telegram-акаунт</h1>
        <p className="mt-3 text-sm text-[var(--tg-hint)]">
          Для входу під іншим Telegram-акаунтом:
        </p>
        <ol className="mt-4 space-y-2 text-left text-sm">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tg-button)] text-xs text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <p className="text-center text-xs text-[var(--tg-hint)]">Оберіть дію</p>
        <button type="button" className="btn-primary w-full" onClick={handleReload}>
          Перезавантажити застосунок
        </button>
        <button type="button" className="btn-secondary w-full" onClick={handleClose}>
          Закрити Crewio
        </button>
      </div>
    </div>
  );
}
