const DESKTOP_PLATFORMS = new Set(['tdesktop', 'macos', 'web', 'weba', 'unknown']);
const MOBILE_PLATFORMS = new Set(['android', 'ios', 'android_x']);

export function classifyTelegramPlatform(platform?: string): 'desktop' | 'mobile' | string {
  if (!platform) return 'unknown';
  const value = platform.toLowerCase();
  if (DESKTOP_PLATFORMS.has(value) || value.includes('desktop')) return 'desktop';
  if (MOBILE_PLATFORMS.has(value)) return 'mobile';
  return value;
}
