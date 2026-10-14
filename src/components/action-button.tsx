"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "./glass";
export function ActionButton({ endpoint, body, children, variant = "glass", disabled = false }: { endpoint: string; body: unknown; children: React.ReactNode; variant?: "glass" | "primary" | "danger"; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""); const router = useRouter();
  return <div><GlassButton variant={variant} disabled={busy || disabled} onClick={async () => { setBusy(true); setError(""); try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to complete this action."); } finally { setBusy(false); } }}>{busy ? "One moment…" : children}</GlassButton>{error && <p role="alert" className="error-message mt-2">{error}</p>}</div>;
}
