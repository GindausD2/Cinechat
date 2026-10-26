/** Calendar labels are local; the countdown always uses a supplied server clock. */
export function screeningCountdown(startsAt: string | Date, serverNow: number) {
  const start = new Date(startsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(serverNow)) return null;
  const remaining = Math.max(0, Math.ceil((start - serverNow) / 1000));
  const days = Math.floor(remaining / 86400), hours = Math.floor(remaining % 86400 / 3600), minutes = Math.floor(remaining % 3600 / 60), seconds = remaining % 60;
  const text = days ? `${days}d ${hours}h ${minutes}m` : hours ? `${hours}h ${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return { remaining, text };
}
