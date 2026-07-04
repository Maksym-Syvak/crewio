import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { authApi } from '@/api/auth.api';
import { disconnectSocket } from '@/sockets/events';

/** Clears all client session state — JWT, zustand, localStorage, sessionStorage. */
export async function clearAppSession() {
  disconnectSocket();

  try {
    const refreshToken = useAuthStore.getState().refreshToken ?? undefined;
    await authApi.logout(refreshToken);
  } catch {
    // JWT is stateless — local cleanup still proceeds
  }

  useAuthStore.getState().logout();
  useOnboardingStore.getState().reset();

  await useAuthStore.persist.clearStorage();
  await useOnboardingStore.persist.clearStorage();

  sessionStorage.clear();
}

export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData || null;
}
