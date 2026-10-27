export function runtimeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Runtime not supplied";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.round(seconds / 60), hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${minutes} min`;
}
export function audioLanguageLabel(language: string) {
  if (!/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(language)) return "Language details not supplied";
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(language) || language; }
  catch { return "Language details not supplied"; }
}
