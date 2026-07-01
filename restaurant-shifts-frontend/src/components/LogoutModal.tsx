interface LogoutModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function LogoutModal({ open, onCancel, onConfirm, loading }: LogoutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--tg-bg)] p-5 shadow-xl"
        role="dialog"
        aria-labelledby="logout-title"
      >
        <h2 id="logout-title" className="text-lg font-bold">
          Ви дійсно хочете вийти?
        </h2>
        <p className="mt-2 text-sm text-[var(--tg-hint)]">
          Сесію буде очищено. Для повторного входу потрібно увійти знову.
        </p>
        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
            Скасувати
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Вихід...' : 'Вийти'}
          </button>
        </div>
      </div>
    </div>
  );
}
