"use client";
import { useEffect, useState } from "react";
import { screeningCountdown } from "@/lib/countdown";

/** Advance a server sample monotonically, independent of the device wall clock. */
export function useScreeningClock(serverTime: number, enabled = true) {
  const [sample, setSample] = useState({ anchor: serverTime, now: serverTime });
  useEffect(() => {
    if (!enabled) return;
    const receivedAt = performance.now();
    const tick = () => setSample({ anchor: serverTime, now: serverTime + performance.now() - receivedAt });
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [serverTime, enabled]);
  return sample.anchor === serverTime ? sample.now : serverTime;
}

export function Countdown({ startsAt, now, readyText = "The screening is starting" }: { startsAt: string | Date; now: number; readyText?: string }) {
  const countdown = screeningCountdown(startsAt, now);
  if (!countdown) return null;
  return <span className="screening-countdown" role="timer" aria-live="off" aria-label="Time until screening" data-remaining={countdown.remaining}>{countdown.remaining ? `Starts in ${countdown.text}` : readyText}</span>;
}

export function ScreeningCountdown({ startsAt, serverTime }: { startsAt: string; serverTime: number }) {
  const now = useScreeningClock(serverTime);
  return <Countdown startsAt={startsAt} now={now} />;
}
