"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PrivacyImage as Image } from "@/components/privacy-image";
import { posterFor } from "@/lib/artwork";
import { ArrowUpRight, Radio, Lock } from "lucide-react";
import { ScreeningTime } from "./screening-time";
import type { TheaterListing, TheaterScope } from "@/lib/theaters";

export function TheaterLobby({ initial, scope, upcoming, ended = false, signedIn, movieId, limit = 50, liveOnly = false }: { initial: TheaterListing[]; scope: TheaterScope; upcoming: boolean; ended?: boolean; signedIn: boolean; movieId?: string; limit?: number; liveOnly?: boolean }) {
  const [rooms, setRooms] = useState(initial), [error, setError] = useState("");
  useEffect(() => {
    if (scope === "private" && !signedIn) return;
    const controller = new AbortController(); let pending = false;
    async function refresh() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/rooms?type=${scope}${upcoming ? "&upcoming=true" : ""}${ended ? "&ended=true" : ""}${movieId ? `&movie=${encodeURIComponent(movieId)}` : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Viewer counts will update when the connection returns.");
        const data = await response.json(); if (!controller.signal.aborted) { setRooms(data.rooms); setError(""); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to refresh theaters."); }
      finally { pending = false; }
    }
    const timer = setInterval(() => { void refresh(); }, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); controller.abort(); document.removeEventListener("visibilitychange", refresh); };
  }, [scope, upcoming, ended, signedIn, movieId]);
  const visibleRooms = rooms.filter(room => !liveOnly || room.status === "Live").slice(0, limit);
  return <>
    {error && <p role="status" className="muted">{error}</p>}
    <div className="room-grid">{visibleRooms.map(room => {
      const canEnter = room.status === "Live" || room.status === "Upcoming";
      const className = `room-card screening-card room-card-${room.visibility.toLowerCase()}`;
      const content = <>
        <div className="screening-poster"><Image src={posterFor(room.movie)} alt={`${room.movie.title} poster`} fill sizes="100px" unoptimized={!posterFor(room.movie).startsWith("/art/films/")} /></div>
        <div className="screening-details">
          <span className="screening-state" data-testid="screening-status">{room.visibility === "PRIVATE" ? <Lock size={12} /> : <Radio size={12} />}{room.status}</span>
          <h3>{room.title}</h3><p className="screening-movie">{room.movie.title}</p>
          <p>{room.movie.genres.join(" / ")} · {Math.round(room.movie.durationSeconds / 60)} min</p>
          <p className="screening-schedule"><ScreeningTime value={room.scheduledAt || room.createdAt} /></p>
          <p>{room.online} watching · {room.capacity} seats</p>
          <small className="screening-privacy">{room.visibility === "PRIVATE" ? "Invitation only · Chat + reactions" : "Worldwide · Emoji reactions only"}</small>
          {canEnter ? <span className="screening-join">{room.status === "Upcoming" ? "Take a seat" : "Join Theater"}<ArrowUpRight size={16} /></span> : <span className="muted">{room.status === "Ended" ? "Screening finished" : "Not available for your region or age"}</span>}
        </div>
      </>;
      return canEnter ? <Link href={`/cinemas/${room.id}`} className={className} key={room.id}>{content}</Link> : <article className={className} key={room.id} aria-label={`${room.title} · ${room.status}`}>{content}</article>;
    })}</div>
    {!visibleRooms.length && <div className="empty-state">
      {scope === "private" ? <Lock size={30} className="mx-auto mb-4" /> : <Radio size={30} className="mx-auto mb-4" />}
      <h2>{scope === "private" ? "Your private screenings." : "The next screening is on its way."}</h2>
      <p>{scope === "private" ? "Only theaters you host or have joined appear here. Follow a host’s invitation to take your seat." : "Browse the film collection, or create a private theater with your invited friends."}</p>
      <Link href={scope === "private" && !signedIn ? "/login" : "/cinemas/new"} className="button button-primary">{scope === "private" && !signedIn ? "Sign in" : "Create theater"}</Link>
    </div>}
  </>;
}
