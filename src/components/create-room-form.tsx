"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Radio, ArrowRight } from "lucide-react";
import { GlassButton } from "./glass";
import { THEATER_LIMITS } from "@/lib/theater-limits";
export function CreateRoomForm({ movies, selected, initialType, canCreatePublic = false }: { movies: { id: string; title: string }[]; selected?: string; initialType?: "PUBLIC" | "PRIVATE"; canCreatePublic?: boolean }) {
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE" | null>(initialType || null), [error, setError] = useState(""), [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...data, visibility: privacy, capacity: Number(data.capacity), accessCode: data.accessCode || undefined, scheduledAt: data.scheduledAt ? new Date(String(data.scheduledAt)).toISOString() : undefined };
    try { const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); router.push(`/cinemas/${result.id}${privacy === "PRIVATE" ? "?invite=1" : ""}`); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to create cinema."); } finally { setBusy(false); }
  }
  if (!privacy) return <div className="glass-card create-room-form theater-choice">
    <span className="eyebrow">1 / 2 · THE AUDIENCE</span>
    <h2>Choose your theater.</h2><p>A shared cinema, or a screening just for your guests.</p>
    <div className="privacy-options">
      <button type="button" disabled={!canCreatePublic} onClick={() => setPrivacy("PUBLIC")}><Radio size={24} /><strong>Public Theater</strong><small>Watch with everyone</small><small>{canCreatePublic ? "Movies, live viewers, and emoji reactions." : "Public screenings are scheduled by CineChat moderators."}</small></button>
      <button type="button" onClick={() => setPrivacy("PRIVATE")}><Lock size={24} /><strong>Private Theater</strong><small>Watch with invited friends</small><small>Private chat, reactions, and secure invitations.</small></button>
    </div>
  </div>;
  return <form className={`form-stack glass-card create-room-form theater-${privacy.toLowerCase()}`} onSubmit={submit}>
    <div className="theater-setup-heading"><div><span className="eyebrow">2 / 2 · YOUR SCREENING</span><h2>{privacy === "PRIVATE" ? "Private Theater" : "Public Theater"}</h2></div><button type="button" onClick={() => setPrivacy(null)}>Change theater type</button></div>
    <label>Theater name<input name="title" placeholder="Friday night, front row" required minLength={3} maxLength={80} /></label>
    <label>About your screening<textarea name="description" placeholder="Set the mood. Tell your guests what to expect." maxLength={500} /></label>
    <label>Tonight’s film<select name="movieId" defaultValue={movies.some(m => m.id === selected) ? selected : movies[0]?.id} required>{movies.map(m => <option value={m.id} key={m.id}>{m.title}</option>)}</select><small>Only films authorized for your age and region are listed.</small></label>
    <div className="form-grid">
      <label>Seats<select name="capacity" key={privacy} defaultValue={privacy === "PUBLIC" ? "100" : "8"}>{[2,4,8,12,20,50,100,250,500,1000].filter(v => v <= (privacy === "PUBLIC" ? THEATER_LIMITS.publicCapacity : THEATER_LIMITS.privateCapacity)).map(v => <option key={v} value={v}>{v} participants</option>)}</select></label>
      <label>Screening date (optional)<input name="scheduledAt" type="datetime-local" /><small>Leave empty to go live now. Your local time.</small></label>
    </div>
    {privacy === "PRIVATE" && <label>Access code (optional)<input name="accessCode" type="password" minLength={6} maxLength={64} autoComplete="new-password" placeholder="An extra layer for your invitation" /><small>Guests need both the invitation and this code.</small></label>}
    <label>Theater atmosphere<select name="theme" defaultValue="silver"><option value="silver">CineChat classic</option><option value="blue">Soft contrast</option><option value="midnight">Midnight cinema</option></select><small>A subtle accent for your screening. All atmospheres are free.</small></label>
    {!movies.length && <p role="status" className="muted">No films are currently authorized for your age and region.</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    <GlassButton variant="primary" disabled={busy || !movies.length}>{busy ? "Preparing your theater…" : "Create theater"}<ArrowRight size={16} /></GlassButton>
  </form>;
}
