import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding';
import { authApi } from '@/api/auth.api';
import { disconnectSocket } from '@/sockets/events';

export const SESSION_FLAGS = {
  AWAITING_TELEGRAM_SWITCH: 'crewio-awaiting-telegram-switch',
  SKIP_AUTO_AUTH: 'crewio-skip-auto-auth',
} as const;

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

/** Log out of Crewio and return to the start screen without auto-login. */
export async function logoutAppSession() {
  await clearAppSession();
  sessionStorage.setItem(SESSION_FLAGS.SKIP_AUTO_AUTH, '1');
}

/** Clear session and wait for the user to switch Telegram account externally. */
export async function prepareTelegramAccountSwitch() {
  await clearAppSession();
  sessionStorage.setItem(SESSION_FLAGS.AWAITING_TELEGRAM_SWITCH, '1');
}

export function isAwaitingTelegramSwitch() {
  return (
    sessionStorage.getItem(SESSION_FLAGS.AWAITING_TELEGRAM_SWITCH) === '1'
  );
}

export function shouldSkipAutoAuth() {
  return sessionStorage.getItem(SESSION_FLAGS.SKIP_AUTO_AUTH) === '1';
}

export function clearSkipAutoAuth() {
  sessionStorage.removeItem(SESSION_FLAGS.SKIP_AUTO_AUTH);
}

export function clearTelegramSwitchFlag() {
  sessionStorage.removeItem(SESSION_FLAGS.AWAITING_TELEGRAM_SWITCH);
}

export function beginFreshTelegramAuth() {
  clearSkipAutoAuth();
  clearTelegramSwitchFlag();
}
