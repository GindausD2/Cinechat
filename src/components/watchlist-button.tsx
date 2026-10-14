"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { GlassButton } from "./glass";
export function WatchlistButton({ movieId, initialSaved = false, signedIn }: { movieId: string; initialSaved?: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initialSaved), [busy, setBusy] = useState(false), [error, setError] = useState(""); const router = useRouter();
  async function toggle() {
    if (!signedIn) { router.push("/login"); return; }
    setBusy(true);
    try { const response = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId, saved: !saved }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setSaved(result.saved); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); } finally { setBusy(false); }
  }
  return <div><GlassButton onClick={toggle} disabled={busy} aria-pressed={saved}>{saved ? <Check size={17} /> : <Plus size={17} />}{saved ? "In your watchlist" : "Watchlist"}</GlassButton>{error && <p role="alert" className="error-message">{error}</p>}</div>;
}
