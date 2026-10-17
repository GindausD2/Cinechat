export function safeReturnPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || (value.includes("\\") || Array.from(value).some(char => char.charCodeAt(0) < 32))) return fallback;
  if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f])/i.test(value)) return fallback;
  try { const url = new URL(value, "https://cinechat.invalid"); return url.origin === "https://cinechat.invalid" && !url.pathname.startsWith("//") ? url.pathname + url.search : fallback; }
  catch { return fallback; }
}
