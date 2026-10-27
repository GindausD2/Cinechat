"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GlassButton } from "./glass";
export function JoinRoom({ roomId, token, requiresCode = false }: { roomId: string; token?: string; requiresCode?: boolean }) {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false); const router = useRouter();
  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try { const response = await fetch(`/api/rooms/${roomId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", token, accessCode: form.get("accessCode") || undefined }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push(`/cinemas/${roomId}`); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to join."); } finally { setBusy(false); }
  }
  return <form onSubmit={join} className="form-stack">{requiresCode && <label>Access code<input name="accessCode" type="password" required maxLength={64} /></label>}{error && <p role="alert" className="error-message">{error} <Link href={`/onboarding?returnTo=${encodeURIComponent(token ? `/invite/${token}` : `/cinemas/${roomId}`)}`}>Review account policies</Link></p>}<GlassButton variant="primary" disabled={busy}>{busy ? "Taking your seat…" : "Join screening"}<ArrowRight size={16} /></GlassButton></form>;
}
