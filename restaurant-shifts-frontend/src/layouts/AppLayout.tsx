import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer } from '@/components/ToastContainer';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { useAppStore } from '@/store';

export function AppLayout() {
  const isOnline = useAppStore((s) => s.isOnline);
  const apiUnreachable = useAppStore((s) => s.apiUnreachable);
  const showOffline = !isOnline || apiUnreachable;

  return (
    <div className="mx-auto min-h-full max-w-lg bg-[var(--tg-bg)]">
      {showOffline && (
        <div className="bg-[var(--crew-burgundy-dark)] px-4 py-2 text-center text-sm text-white">
          Немає з&apos;єднання з сервером
        </div>
      )}
      <WorkspaceSwitcher />
      <Outlet />
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
