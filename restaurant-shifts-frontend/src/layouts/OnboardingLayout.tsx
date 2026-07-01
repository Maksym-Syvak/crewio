import { Outlet } from 'react-router-dom';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { useOnboardingNavigation } from '@/hooks/useOnboardingNavigation';

export function OnboardingLayout() {
  const { showBack, goBack } = useOnboardingNavigation();

  return (
    <div className="mx-auto min-h-full max-w-lg bg-[var(--tg-bg)]">
      <OnboardingHeader showBack={showBack} onBack={goBack} />
      <Outlet />
    </div>
  );
}
