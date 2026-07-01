import { Outlet } from 'react-router-dom';

export function OnboardingLayout() {
  return (
    <div className="mx-auto min-h-full max-w-lg bg-[var(--tg-bg)]">
      <Outlet />
    </div>
  );
}
