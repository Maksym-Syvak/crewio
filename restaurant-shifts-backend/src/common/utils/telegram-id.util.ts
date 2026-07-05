/** Normalize Telegram user id to string for DB lookup and storage. */
export function normalizeTelegramId(id: number | string | bigint): string {
  return String(id).trim();
}
