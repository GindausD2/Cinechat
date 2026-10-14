"use client";
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { GlassButton } from "./glass";
export function ReminderButton({ roomId }: { roomId: string }) {
  const [enabled, setEnabled] = useState(false), [error, setError] = useState("");
  return <div><GlassButton onClick={async () => { try { const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, enabled: !enabled }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setEnabled(!enabled); } catch (e) { setError(e instanceof Error ? e.message : "Unable to set reminder."); } }}>{enabled ? <BellOff size={14} /> : <Bell size={14} />}{enabled ? "Cancel reminder" : "Remind me"}</GlassButton>{error && <p className="error-message" role="alert">{error}</p>}</div>;
}
