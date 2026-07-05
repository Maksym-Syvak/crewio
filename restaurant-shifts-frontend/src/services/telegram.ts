/** Apply Crewio burgundy theme; respect Telegram light/dark mode. */
import { sleep } from '@/utils/async';

export function initTelegramApp() {
  const tg = window.Telegram?.WebApp;
  const root = document.documentElement;

  if (tg) {
    tg.ready();
    tg.expand();
    root.dataset.theme = tg.colorScheme;
  } else {
    root.dataset.theme = 'light';
  }

  applyCrewioTheme(root.dataset.theme === 'dark');
  return tg ?? null;
}

function applyCrewioTheme(isDark: boolean) {
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty('--tg-bg', '#1a0a10');
    root.style.setProperty('--tg-text', '#fce8ee');
    root.style.setProperty('--tg-hint', '#b8909c');
    root.style.setProperty('--tg-secondary-bg', '#2d1520');
    root.style.setProperty('--tg-link', '#e85d7a');
    root.style.setProperty('--tg-button', '#a91d47');
    root.style.setProperty('--tg-button-text', '#ffffff');
  } else {
    root.style.setProperty('--tg-bg', '#fdf5f6');
    root.style.setProperty('--tg-text', '#2d0a14');
    root.style.setProperty('--tg-hint', '#9a6b76');
    root.style.setProperty('--tg-secondary-bg', '#f8e8ec');
    root.style.setProperty('--tg-link', '#8b1538');
    root.style.setProperty('--tg-button', '#8b1538');
    root.style.setProperty('--tg-button-text', '#ffffff');
  }
}

export function isTelegramEnv() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  return Boolean(tg.initData?.trim() || tg.initDataUnsafe?.user?.id);
}

/** Raw Telegram WebApp platform (tdesktop, android, ios, …). */
export function getTelegramPlatform() {
  return window.Telegram?.WebApp?.platform ?? 'unknown';
}

/** Telegram Desktop may expose initData shortly after ready(). */
export async function waitForTelegramInitData(maxWaitMs = 5000): Promise<string> {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    throw new Error('Відкрийте застосунок у Telegram');
  }

  tg.ready();
  tg.expand();

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const initData = tg.initData?.trim();
    if (initData) return initData;
    await sleep(100);
  }

  throw new Error(
    'Telegram не передав дані авторизації. Закрийте та відкрийте застосунок ще раз.',
  );
}

export function getTelegramUserIdFromClient(): string | null {
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return id != null ? String(id).trim() : null;
}

export function telegramIdsMatch(
  persistedId: string | undefined | null,
  clientId: string | null,
): boolean {
  if (!persistedId || !clientId) return true;
  return String(persistedId).trim() === String(clientId).trim();
}

export function closeTelegramApp() {
  window.Telegram?.WebApp?.close();
}

export function reloadApp() {
  window.location.reload();
}
