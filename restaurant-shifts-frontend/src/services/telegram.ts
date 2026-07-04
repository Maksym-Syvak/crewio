/** Apply Crewio burgundy theme; respect Telegram light/dark mode. */
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
  return Boolean(window.Telegram?.WebApp?.initData);
}

export function closeTelegramApp() {
  window.Telegram?.WebApp?.close();
}

export function reloadApp() {
  window.location.reload();
}
