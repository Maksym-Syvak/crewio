import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer } from '@/components/ToastContainer';
import { useAppStore } from '@/store';

export function AppLayout() {
  const isOnline = useAppStore((s) => s.isOnline);

  return (
    <div className="mx-auto min-h-full max-w-lg bg-[var(--tg-bg)]">
      {!isOnline && (
        <div className="bg-[var(--crew-red)] px-4 py-2 text-center text-sm text-white">
          Немає з'єднання з інтернетом
        </div>
      )}
      <Outlet />
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
