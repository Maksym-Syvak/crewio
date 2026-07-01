import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getBackPath,
  pathToStep,
  useOnboardingStore,
} from '@/store/onboarding';
import { clearAppSession } from '@/utils/session';

export function useOnboardingNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const backPath = getBackPath(pathname);
  const step = pathToStep(pathname);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const reset = useOnboardingStore((s) => s.reset);

  useEffect(() => {
    setCurrentStep(step);
  }, [step, setCurrentStep]);

  const goBack = useCallback(() => {
    if (!backPath) return;
    navigate(backPath);
  }, [backPath, navigate]);

  const cancelRegistration = useCallback(async () => {
    reset();
    await clearAppSession();
    navigate('/splash', { replace: true });
  }, [reset, navigate]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (backPath) {
      tg.BackButton.show();
      tg.BackButton.onClick(goBack);
      return () => {
        tg.BackButton.offClick(goBack);
        tg.BackButton.hide();
      };
    }

    tg.BackButton.hide();
    return undefined;
  }, [backPath, goBack]);

  return {
    step,
    backPath,
    showBack: Boolean(backPath),
    goBack,
    cancelRegistration,
  };
}
