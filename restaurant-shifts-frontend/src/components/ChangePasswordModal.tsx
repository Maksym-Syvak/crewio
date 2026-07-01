import { useState } from 'react';
import { usersApi } from '@/api/users.api';
import { getErrorMessage } from '@/api/client';
import { useToastStore } from '@/store';

interface ChangePasswordModalProps {
  open: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onSuccess: (user: import('@/types').User) => void;
}

export function ChangePasswordModal({
  open,
  hasPassword,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const push = useToastStore((s) => s.push);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      push({ type: 'error', title: 'Паролі не співпадають' });
      return;
    }
    setLoading(true);
    try {
      const updated = await usersApi.changePassword({
        current_password: hasPassword ? current : undefined,
        password,
        password_confirm: confirm,
      });
      push({ type: 'success', title: 'Пароль оновлено' });
      onSuccess(updated);
      onClose();
    } catch (err) {
      push({ type: 'error', title: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--tg-bg)] p-5 shadow-xl">
        <h2 className="text-lg font-bold">
          {hasPassword ? 'Змінити пароль' : 'Створити пароль'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {hasPassword && (
            <input
              className="field-input w-full"
              type="password"
              placeholder="Поточний пароль"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          )}
          <input
            className="field-input w-full"
            type="password"
            placeholder="Новий пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
          />
          <input
            className="field-input w-full"
            type="password"
            placeholder="Повторіть пароль"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
          />
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? '...' : 'Зберегти'}
            </button>
          </div>
        </form>
        <style>{`
          .field-input {
            border-radius: 10px;
            background: var(--tg-secondary-bg);
            padding: 12px;
            border: 1px solid color-mix(in srgb, var(--crew-burgundy) 15%, transparent);
            color: var(--tg-text);
          }
        `}</style>
      </div>
    </div>
  );
}
