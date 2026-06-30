import { useToastStore } from '@/store';
import { cn } from '@/utils/cn';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-3 right-3 left-3 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'rounded-xl px-4 py-3 shadow-lg backdrop-blur',
            t.type === 'urgent' && 'bg-[var(--crew-red)] text-white',
            t.type === 'error' && 'bg-[var(--crew-red)] text-white',
            t.type === 'success' && 'bg-[var(--crew-green)] text-white',
            t.type === 'info' && 'bg-[var(--tg-secondary-bg)] text-[var(--tg-text)]',
          )}
          onClick={() => dismiss(t.id)}
        >
          <div className="font-semibold">{t.title}</div>
          {t.body && <div className="mt-0.5 text-sm opacity-90">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
