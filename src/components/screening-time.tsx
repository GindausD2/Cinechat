"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function ScreeningTime({ value }: { value: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat(ready ? undefined : "en-US", { dateStyle: "medium", timeStyle: "short", ...(ready ? {} : { timeZone: "UTC" }) }).format(date);
  const zone = ready ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return <time dateTime={value} title={zone} className="screening-time">{formatted} <small>{zone.replaceAll("_", " ")}</small></time>;
}
