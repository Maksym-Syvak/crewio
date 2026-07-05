import { reloadApp } from '@/services/telegram';

interface Props {
  onRetry: () => void;
  retrying?: boolean;
}

export function ConnectionErrorScreen({ onRetry, retrying }: Props) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-5xl">📡</div>
      <div>
        <h1 className="text-xl font-bold">Не вдалося підключитися до сервера.</h1>
        <p className="mt-2 text-sm text-[var(--tg-hint)]">
          Перевірте інтернет або зачекайте, поки сервер прокинеться.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? 'Підключення...' : 'Спробувати ще раз'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => reloadApp()}>
          Перезавантажити
        </button>
      </div>
    </div>
  );
}
