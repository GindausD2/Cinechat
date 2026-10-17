"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, Lock } from "lucide-react";
import { ScreeningTime } from "./screening-time";
import type { TheaterListing, TheaterScope } from "@/lib/theaters";

export function TheaterLobby({ initial, scope, upcoming, signedIn }: { initial: TheaterListing[]; scope: TheaterScope; upcoming: boolean; signedIn: boolean }) {
  const [rooms, setRooms] = useState(initial), [error, setError] = useState("");
  useEffect(() => {
    if (scope === "private" && !signedIn) return;
    const controller = new AbortController(); let pending = false;
    async function refresh() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/rooms?type=${scope}${upcoming ? "&upcoming=true" : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Viewer counts will update when the connection returns.");
        const data = await response.json(); if (!controller.signal.aborted) { setRooms(data.rooms); setError(""); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to refresh theaters."); }
      finally { pending = false; }
    }
    const timer = setInterval(() => { void refresh(); }, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); controller.abort(); document.removeEventListener("visibilitychange", refresh); };
  }, [scope, upcoming, signedIn]);
  return <>
    {error && <p role="status" className="muted">{error}</p>}
    <div className="room-grid">{rooms.map(room => <Link href={`/cinemas/${room.id}`} className={`room-card room-card-${room.visibility.toLowerCase()}`} key={room.id}>
      <div className="room-card-backdrop" style={{ backgroundImage: `url('${room.artwork}')` }} />
      <div className="room-card-content">
        <span className="pill">{room.visibility === "PRIVATE" ? <Lock size={11} /> : <Radio size={11} />}{room.scheduledAt && new Date(room.scheduledAt) > new Date() ? <ScreeningTime value={room.scheduledAt} /> : `${room.online} watching · ${room.capacity} seats`}</span>
        <h3>{room.title}</h3><p>{room.movie.title}</p><small className="room-audience">{room.visibility === "PRIVATE" ? "Invitation only · Private chat + reactions" : "Public theater · Emoji reactions"}</small>
        <div><span className="muted">Hosted by {room.host.name}</span><span className="join-arrow">Join Theater <ArrowUpRight size={16} /></span></div>
      </div>
    </Link>)}</div>
    {!rooms.length && <div className="empty-state">
      {scope === "private" ? <Lock size={30} className="mx-auto mb-4" /> : <Radio size={30} className="mx-auto mb-4" />}
      <h2>{scope === "private" ? "Your private screenings." : "Your screening could be the first."}</h2>
      <p>{scope === "private" ? "Only theaters you host or have joined appear here. Follow a host’s invitation to take your seat." : "Start a theater for the community or a screening with your invited friends."}</p>
      <Link href={scope === "private" && !signedIn ? "/login" : "/cinemas/new"} className="button button-primary">{scope === "private" && !signedIn ? "Sign in" : "Create theater"}</Link>
    </div>}
  </>;
}
