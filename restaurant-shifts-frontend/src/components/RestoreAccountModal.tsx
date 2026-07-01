interface RestoreAccountModalProps {
  open: boolean;
  loading?: boolean;
  onRestore: () => void;
  onCreateNew: () => void;
  onCancel?: () => void;
}

export function RestoreAccountModal({
  open,
  loading,
  onRestore,
  onCreateNew,
  onCancel,
}: RestoreAccountModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--tg-bg)] p-5 shadow-xl"
        role="dialog"
        aria-labelledby="restore-title"
      >
        <h2 id="restore-title" className="text-lg font-bold">
          Виявлено раніше видалений профіль
        </h2>
        <p className="mt-2 text-sm text-[var(--tg-hint)]">
          Ви можете відновити попередній акаунт або створити новий профіль з нуля.
        </p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={loading}
            onClick={onRestore}
          >
            {loading ? '...' : 'Відновити профіль'}
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            disabled={loading}
            onClick={onCreateNew}
          >
            Створити новий профіль
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary w-full" onClick={onCancel}>
              Скасувати
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
