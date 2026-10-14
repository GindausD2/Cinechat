"use client";
import { useState } from "react";
import { CinemaPlayer, type ClientPlayback } from "./cinema-player";
export function SoloPlayer({ media, movieId, duration, startAt, poster }: { media: { url: string; format: string; subtitleUrl: string | null }; movieId: string; duration: number; startAt: number; poster?: string }) {
  const [state, setState] = useState<ClientPlayback>({ playing: false, position: startAt, version: 0, serverTime: 0, duration });
  return <CinemaPlayer media={media} playback={state} movieId={movieId} canControl isSolo poster={poster} onControl={(action, position) => setState(old => ({ ...old, playing: action === "play" ? true : action === "pause" ? false : old.playing, position: position ?? old.position, serverTime: Date.now(), version: old.version + 1 }))} />;
}
