export const COOKIE_PREFERENCE_KEY = "cinechat-cookie-preferences";
export const COOKIE_PREFERENCE_DAYS = 180;
export type CookiePreferences = { version: 1; externalImages: boolean; updatedAt: number; expiresAt: number };
export function parseCookiePreferences(raw: string | null, now = Date.now()): CookiePreferences | null {
  if (!raw || raw.length > 512) return null;
  try {
    const value = JSON.parse(raw);
    if (value.version !== 1 || typeof value.externalImages !== "boolean" || !Number.isFinite(value.updatedAt) || !Number.isFinite(value.expiresAt) || value.updatedAt > now + 60000 || value.expiresAt <= now || value.expiresAt > value.updatedAt + COOKIE_PREFERENCE_DAYS * 86400000) return null;
    return { version: 1, externalImages: value.externalImages, updatedAt: value.updatedAt, expiresAt: value.expiresAt };
  } catch { return null; }
}
export function makeCookiePreferences(externalImages: boolean, now = Date.now()): CookiePreferences {
  return { version: 1, externalImages, updatedAt: now, expiresAt: now + COOKIE_PREFERENCE_DAYS * 86400000 };
}
export function isLocalImage(src: string) { return src.startsWith("/") && !src.startsWith("//") && !src.includes("\\"); }
export function isExternalImage(src: string) {
  try { const url = new URL(src); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
