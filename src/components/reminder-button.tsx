"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { GlassButton } from "./glass";
type Preference = { enabled: boolean; sentAt: string | null; canRemind: boolean };
export function ReminderButton({ roomId }: { roomId: string }) {
  const [preference, setPreference] = useState<Preference | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/reminders?roomId=${encodeURIComponent(roomId)}`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (!controller.signal.aborted) { setPreference(data); setError(""); }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load your reminder."); });
    return () => controller.abort();
  }, [roomId, retry]);
  async function toggle() {
    if (!preference || busy) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, enabled: !preference.enabled }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setPreference(data);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update your reminder."); }
    finally { setBusy(false); }
  }
  return <div className="screening-reminder">
    {preference ? <GlassButton onClick={toggle} disabled={busy || (!preference.enabled && !preference.canRemind)} aria-pressed={preference.enabled}>{preference.enabled ? <BellOff size={14} /> : <Bell size={14} />}{busy ? "Saving…" : preference.enabled ? "Cancel reminder" : preference.canRemind ? "Remind me" : "Reminder unavailable"}</GlassButton> : error ? <GlassButton onClick={() => { setError(""); setRetry(value => value + 1); }}>Retry reminder</GlassButton> : <span className="muted" role="status">Loading your reminder…</span>}
    {preference?.sentAt && <small className="muted">Reminder delivered to your notifications.</small>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </div>;
}
