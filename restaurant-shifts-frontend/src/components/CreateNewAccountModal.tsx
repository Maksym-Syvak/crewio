interface CreateNewAccountModalProps {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CreateNewAccountModal({
  open,
  loading,
  onConfirm,
  onCancel,
}: CreateNewAccountModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--tg-bg)] p-5 shadow-xl"
        role="dialog"
        aria-labelledby="create-new-title"
      >
        <h2 id="create-new-title" className="text-lg font-bold">
          Створити новий профіль?
        </h2>
        <p className="mt-2 text-sm text-[var(--tg-hint)]">
          Попередній видалений профіль буде остаточно видалено. Цю дію неможливо
          скасувати.
        </p>
        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
            Скасувати
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? '...' : 'Створити'}
          </button>
        </div>
      </div>
    </div>
  );
}
