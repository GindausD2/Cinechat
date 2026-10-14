"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Captions, LoaderCircle } from "lucide-react";
import Hls from "hls.js";
import { driftCorrection } from "@/lib/playback";
import { GlassPlayerControls } from "./glass";
export type ClientPlayback = { playing: boolean; position: number; version: number; serverTime: number; duration: number };
function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function switchTextTracks(element: HTMLVideoElement) { for (const track of element.textTracks) track.mode = track.mode === "showing" ? "disabled" : "showing"; }
export function CinemaPlayer({ media, playback, canControl, onControl, movieId, clockOffset = 0, isSolo = false, poster, children }: { media: { url: string; format: string; subtitleUrl: string | null }; playback: ClientPlayback; canControl: boolean; onControl: (action: "play" | "pause" | "seek", position?: number) => void; movieId: string; clockOffset?: number; isSolo?: boolean; poster?: string; children?: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null), shell = useRef<HTMLDivElement>(null), saveTime = useRef(0), received = useRef(playback);
  const [position, setPosition] = useState(playback.position), [muted, setMuted] = useState(true), [volume, setVolume] = useState(.7), [buffering, setBuffering] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    const element = video.current; if (!element) return;
    let hls: Hls | null = null;
    if (media.format === "hls" && !element.canPlayType("application/vnd.apple.mpegurl")) {
      if (!Hls.isSupported()) { element.dispatchEvent(new Event("error")); return; }
      hls = new Hls(); hls.loadSource(media.url); hls.attachMedia(element);
    } else { element.src = media.url; }
    return () => { hls?.destroy(); element.pause(); element.removeAttribute("src"); element.load(); };
  }, [media.url, media.format]);
  useEffect(() => {
    received.current = playback;
    const element = video.current; if (!element) return;
    const expected = Math.min(playback.duration, playback.position + (playback.playing ? Math.max(0, (Date.now() + clockOffset - playback.serverTime) / 1000) : 0));
    if (element.readyState >= 1 && Math.abs(element.currentTime - expected) > .25) element.currentTime = expected;
    if (playback.playing) void element.play().catch(() => setError("Tap Play to allow playback in your browser.")); else element.pause();
  }, [playback, clockOffset]);
  useEffect(() => {
    if (isSolo) return;
    const timer = setInterval(() => {
      const element = video.current, state = received.current; if (!element || element.readyState < 2) return;
      const expected = Math.min(state.duration, state.position + (state.playing ? Math.max(0, (Date.now() + clockOffset - state.serverTime) / 1000) : 0));
      const correction = driftCorrection(element.currentTime, expected);
      if (correction.seek !== null) element.currentTime = correction.seek;
      element.playbackRate = state.playing ? correction.rate : 1;
      if (!state.playing && !element.paused) element.pause();
      if (state.playing && element.paused) void element.play().catch(() => {});
    }, 2000); return () => clearInterval(timer);
  }, [clockOffset, isSolo]);
  function onTimeUpdate() {
    const element = video.current; if (!element) return; setPosition(element.currentTime);
    if (element.currentTime > 0 && Date.now() - saveTime.current > 20000) {
      saveTime.current = Date.now(); void fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId, position: element.currentTime }) }).catch(() => {});
    }
  }
  function audioToggle() { const element = video.current; if (!element) return; element.muted = !muted; element.volume = volume; setMuted(!muted); }
  function toggleCaptions() { if (video.current) switchTextTracks(video.current); }
  function toggle() {
    setError("");
    if (canControl) onControl(playback.playing ? "pause" : "play", video.current?.currentTime ?? position);
    else if (playback.playing) void video.current?.play().catch(() => setError("Playback could not start."));
  }
  // eslint-disable-next-line jsx-a11y/media-has-caption -- Authorized subtitle tracks render conditionally; controls are shown only when a real track exists.
  return <div className="player-shell" ref={shell}><video ref={video} data-testid="cinema-video" poster={poster} muted={muted} playsInline preload="metadata" onTimeUpdate={onTimeUpdate} onLoadStart={() => setBuffering(true)} onWaiting={() => setBuffering(true)} onCanPlay={() => { setBuffering(false); if (received.current.playing) void video.current?.play().catch(() => {}); }} onPlaying={() => setBuffering(false)} onError={() => { setBuffering(false); setError("The media could not be loaded. Check the source or try again."); }} onEnded={() => { if (canControl) onControl("pause", playback.duration); }} aria-label="Cinema video">{media.subtitleUrl && <track kind="subtitles" src={media.subtitleUrl} srcLang="en" label="English" />}</video>
    {!playback.playing && !buffering && <button aria-label={canControl ? "Play film" : "Waiting for host"} className="center-play" onClick={toggle} disabled={!canControl}><Play size={28} fill="currentColor" /></button>}
    {buffering && <div className="player-loading" role="status"><LoaderCircle size={28} className="spin" /><span>Finding your frame…</span></div>}
    {error && <div className="player-error" role="alert">{error}<button onClick={() => { setError(""); video.current?.load(); }}>Reload media</button></div>}
    {children}
    <GlassPlayerControls><div className="seek-line"><input type="range" aria-label="Seek film" min="0" max={playback.duration} step=".1" value={Math.min(position, playback.duration)} disabled={!canControl} onChange={e => onControl("seek", Number(e.target.value))} /></div><div className="controls-row"><button aria-label={playback.playing ? "Pause film" : "Play film"} disabled={!canControl} onClick={toggle}>{playback.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><span className="player-time">{formatTime(position)} <span>/ {formatTime(playback.duration)}</span></span><span className="host-control-label">{isSolo ? "YOUR SCREENING" : canControl ? "YOU’RE THE HOST" : "HOST CONTROLS PLAYBACK"}</span><button aria-label={muted ? "Unmute audio" : "Mute audio"} onClick={audioToggle}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" className="volume-slider" aria-label="Volume" min="0" max="1" step=".05" value={volume} onChange={e => { const value = Number(e.target.value); setVolume(value); if (video.current) { video.current.volume = value; video.current.muted = value === 0; setMuted(value === 0); } }} />{media.subtitleUrl && <button aria-label="Toggle subtitles" onClick={toggleCaptions}><Captions size={18} /></button>}<button aria-label="Fullscreen" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void shell.current?.requestFullscreen().catch(() => setError("Fullscreen is not supported in this browser.")); }}><Maximize size={18} /></button></div></GlassPlayerControls>
  </div>;
}
