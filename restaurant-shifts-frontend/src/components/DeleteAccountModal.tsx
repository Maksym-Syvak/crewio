interface DeleteAccountModalProps {
  open: boolean;
  role: 'owner' | 'admin' | 'employee' | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (confirmDeleteRestaurant?: boolean) => void;
}

export function DeleteAccountModal({
  open,
  role,
  loading,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  if (!open) return null;

  let message =
    'Ви дійсно хочете видалити акаунт? Цю дію неможливо скасувати.';

  if (role === 'admin') {
    message =
      'Перед видаленням передайте права іншому адміністратору. Видалення адміністратора заборонено.';
  }

  if (role === 'owner') {
    message =
      'Видалення власника призведе до видалення всього закладу. Продовжити?';
  }

  const canDelete = role !== 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--tg-bg)] p-5 shadow-xl">
        <h2 className="text-lg font-bold">Видалити акаунт</h2>
        <p className="mt-2 text-sm text-[var(--tg-hint)]">{message}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
            Скасувати
          </button>
          {canDelete && (
            <button
              type="button"
              className="btn-danger flex-1"
              disabled={loading}
              onClick={() => onConfirm(role === 'owner' ? true : undefined)}
            >
              {loading ? '...' : 'Видалити'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
