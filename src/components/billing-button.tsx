"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "./glass";
export function BillingButton({ action, children, disabled = false }: { action: "checkout" | "portal" | "cancel"; children: React.ReactNode; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""); const router = useRouter();
  return <div><GlassButton variant={action === "checkout" ? "primary" : "glass"} disabled={busy || disabled} onClick={async () => { setBusy(true); setMessage(""); try { const response = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (data.url) window.location.assign(data.url); else { setMessage(data.message); router.refresh(); } } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to open billing."); } finally { setBusy(false); } }}>{busy ? "One moment…" : children}</GlassButton>{message && <p role="status" className="muted text-xs mt-3">{message}</p>}</div>;
}
