export function initTelegramApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  tg.ready();
  tg.expand();

  const root = document.documentElement;
  const tp = tg.themeParams;

  if (tp.bg_color) root.style.setProperty('--tg-bg', tp.bg_color);
  if (tp.text_color) root.style.setProperty('--tg-text', tp.text_color);
  if (tp.hint_color) root.style.setProperty('--tg-hint', tp.hint_color);
  if (tp.link_color) root.style.setProperty('--tg-link', tp.link_color);
  if (tp.button_color) root.style.setProperty('--tg-button', tp.button_color);
  if (tp.button_text_color)
    root.style.setProperty('--tg-button-text', tp.button_text_color);
  if (tp.secondary_bg_color)
    root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color);

  root.dataset.theme = tg.colorScheme;
  return tg;
}

export function isTelegramEnv() {
  return Boolean(window.Telegram?.WebApp?.initData);
}
