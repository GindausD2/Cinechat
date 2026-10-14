"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { GlassModal, GlassButton } from "./glass";
export function CreateClubForm() {
  const [open, setOpen] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { const response = await fetch("/api/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...Object.fromEntries(new FormData(event.currentTarget)) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setOpen(false); router.push(`/clubs/${data.id}`); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create club."); } finally { setBusy(false); } }
  return <><GlassButton variant="primary" onClick={() => setOpen(true)}><Plus size={16} />Create a club</GlassButton><GlassModal open={open} onClose={() => setOpen(false)} title="Find your kind of cinema."><form onSubmit={submit} className="form-stack"><label>Club name<input name="name" required minLength={3} maxLength={60} placeholder="The Sunday Screen Society" /></label><label>About the club<textarea name="description" required minLength={10} maxLength={500} placeholder="What brings your film lovers together?" /></label><label>Favorite genre<select name="genre">{["All cinema", "Animation", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi"].map(v => <option key={v}>{v}</option>)}</select></label><label>Club color<select name="color"><option value="#d9e4c8">Sage</option><option value="#98b6b8">Ocean</option><option value="#c8acd7">Orchid</option></select></label>{error && <p role="alert" className="error-message">{error}</p>}<GlassButton variant="primary" disabled={busy}>Create club</GlassButton></form></GlassModal></>;
}
