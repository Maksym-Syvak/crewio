import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { authApi } from '@/api/auth.api';
import { disconnectSocket } from '@/sockets/events';

const LOGGED_OUT_KEY = 'crewio-logged-out';

export function markLoggedOut() {
  sessionStorage.setItem(LOGGED_OUT_KEY, '1');
}

export function isLoggedOut() {
  return sessionStorage.getItem(LOGGED_OUT_KEY) === '1';
}

export function clearLoggedOut() {
  sessionStorage.removeItem(LOGGED_OUT_KEY);
}

/** Wipes client-side session and calls backend logout while JWT is still valid. */
export async function clearAppSession() {
  disconnectSocket();

  try {
    await authApi.logout();
  } catch {
    // JWT is stateless — local cleanup still proceeds
  }

  useOnboardingStore.getState().reset();
  useAuthStore.getState().logout();

  await useAuthStore.persist.clearStorage();
  await useOnboardingStore.persist.clearStorage();

  markLoggedOut();
}
