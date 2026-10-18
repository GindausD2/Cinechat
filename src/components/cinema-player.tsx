"use client";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Captions, LoaderCircle, Eye, EyeOff } from "lucide-react";
import Hls from "hls.js";
import type { Subtitle } from "@/lib/media";
import { driftCorrection } from "@/lib/playback";
import { GlassPlayerControls } from "./glass";
export type ClientPlayback = { playing: boolean; position: number; version: number; serverTime: number; duration: number };
function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export type PlayerMedia = { url: string; format: string; subtitleUrl: string | null; subtitles?: Subtitle[] };
export function CinemaPlayer({ media, playback, canControl, onControl, movieId, clockOffset = 0, isSolo = false, publicTheater = false, poster, children }: { media: PlayerMedia; playback: ClientPlayback; canControl: boolean; onControl: (action: "play" | "pause" | "seek", position?: number) => void; movieId: string; clockOffset?: number; isSolo?: boolean; publicTheater?: boolean; poster?: string; children?: ReactNode }) {
  const hlsInstance = useRef<Hls | null>(null);
  const [revision, setRevision] = useState(0), [levels, setLevels] = useState<{ index: number; height: number }[]>([]), [quality, setQuality] = useState(-1), [captionLanguage, setCaptionLanguage] = useState("off"), [controlsVisible, setControlsVisible] = useState(true), [expanded, setExpanded] = useState(false);
  const subtitleTracks = media.subtitles || (media.subtitleUrl ? [{ language: "en", label: "English", url: media.subtitleUrl }] : []);
  const activeLanguage = subtitleTracks.some(track => track.language === captionLanguage) ? captionLanguage : "off";
  const video = useRef<HTMLVideoElement>(null), shell = useRef<HTMLDivElement>(null), controls = useRef<HTMLDivElement>(null), saveTime = useRef(0), received = useRef(playback);
  const [position, setPosition] = useState(playback.position), [muted, setMuted] = useState(true), [volume, setVolume] = useState(.7), [buffering, setBuffering] = useState(true), [error, setError] = useState("");
  const playFailure = useCallback((failure: unknown) => {
    if (failure instanceof DOMException && failure.name === "AbortError") return;
    setError(failure instanceof DOMException && failure.name === "NotAllowedError" ? "Your browser needs a tap to join this screening." : "Playback could not start. Reload the media to recover your place.");
  }, []);
  useEffect(() => {
    const element = controls.current; if (!element) return;
    const measure = () => { const inset = parseFloat(getComputedStyle(element).bottom) || 0; shell.current?.style.setProperty("--controls-height", `${element.getBoundingClientRect().height + inset}px`); };
    const observer = new ResizeObserver(measure); observer.observe(element); measure(); return () => observer.disconnect();
  }, []);
  useEffect(() => { const element = video.current; if (element) for (const track of element.textTracks) track.mode = track.language === activeLanguage ? "showing" : "disabled"; }, [activeLanguage, media.url, revision]);
  useEffect(() => {
    const element = video.current; if (!element) return;
    let hls: Hls | null = null; let recoveries = 0;
    if (media.format === "hls" && Hls.isSupported()) {
      hls = new Hls(); hlsInstance.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => { setLevels(data.levels.map((level, index) => ({ index, height: level.height }))); setQuality(-1); });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (recoveries < 2 && data.type === Hls.ErrorTypes.NETWORK_ERROR) { recoveries++; setBuffering(true); hls?.startLoad(); }
        else if (recoveries < 2 && data.type === Hls.ErrorTypes.MEDIA_ERROR) { recoveries++; hls?.recoverMediaError(); }
        else { setBuffering(false); setError("The stream was interrupted. Reload to recover your place in the screening."); }
      });
      hls.loadSource(media.url); hls.attachMedia(element);
    } else if (media.format === "hls" && !element.canPlayType("application/vnd.apple.mpegurl")) { element.dispatchEvent(new Event("error")); }
    else { element.src = media.url; }
    return () => { hls?.destroy(); hlsInstance.current = null; element.pause(); element.removeAttribute("src"); element.load(); };
  }, [media.url, media.format, revision]);
  useEffect(() => {
    received.current = playback;
    const element = video.current; if (!element) return;
    const expected = Math.min(playback.duration, playback.position + (playback.playing ? Math.max(0, (Date.now() + clockOffset - playback.serverTime) / 1000) : 0));
    if (element.readyState >= 1 && Math.abs(element.currentTime - expected) > .25) element.currentTime = expected;
    if (playback.playing) void element.play().catch(playFailure); else element.pause();
  }, [playback, clockOffset, playFailure]);
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
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); };
  }, [expanded]);
  function restoreTimeline() {
    const element = video.current, state = received.current; if (!element || element.readyState < 1) return;
    const expected = Math.min(state.duration, state.position + (state.playing ? Math.max(0, (Date.now() + clockOffset - state.serverTime) / 1000) : 0));
    if (Math.abs(element.currentTime - expected) > .25) element.currentTime = expected;
    if (state.playing) void element.play().catch(playFailure); else element.pause();
  }
  function reload() { setError(""); setBuffering(true); setRevision(old => old + 1); }
  function allowPlayback() { setError(""); restoreTimeline(); }
  async function fullscreen() {
    if (expanded) { setExpanded(false); return; }
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    try { if (!shell.current?.requestFullscreen) throw new Error(); await shell.current.requestFullscreen(); }
    catch { setExpanded(true); }
  }
  function onTimeUpdate() {
    const element = video.current; if (!element) return; setPosition(element.currentTime);
    if (element.currentTime > 0 && Date.now() - saveTime.current > 20000) {
      saveTime.current = Date.now(); void fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId, position: element.currentTime }) }).catch(() => {});
    }
  }
  function audioToggle() { const element = video.current; if (!element) return; element.muted = !muted; element.volume = volume; setMuted(!muted); }
  function toggleCaptions() { setCaptionLanguage(activeLanguage === "off" ? subtitleTracks[0]?.language || "off" : "off"); }
  function toggle() {
    setError("");
    if (canControl) onControl(playback.playing ? "pause" : "play", video.current?.currentTime ?? position);
    else if (playback.playing) void video.current?.play().catch(playFailure);
  }
  // eslint-disable-next-line jsx-a11y/media-has-caption -- Authorized subtitle tracks render conditionally; controls are shown only when a real track exists.
  return <div className={`player-shell ${expanded ? "is-expanded" : ""} ${controlsVisible ? "" : "controls-hidden"}`} ref={shell}><video ref={video} data-testid="cinema-video" poster={poster} crossOrigin="anonymous" muted={muted} playsInline preload="metadata" onTimeUpdate={onTimeUpdate} onLoadedMetadata={restoreTimeline} onLoadStart={() => setBuffering(true)} onWaiting={() => setBuffering(true)} onCanPlay={() => { setBuffering(false); restoreTimeline(); }} onPlaying={() => { setBuffering(false); setError(current => current.startsWith("Your browser needs") ? "" : current); }} onError={() => { setBuffering(false); setError("The media could not be loaded. Check the source or try again."); }} onEnded={() => { if (canControl) onControl("pause", playback.duration); }} aria-label="Cinema video">{subtitleTracks.map(track => <track key={`${track.language}-${track.url}`} kind="subtitles" src={track.url} srcLang={track.language} label={track.label} onLoad={() => { const element = video.current; if (element) for (const textTrack of element.textTracks) textTrack.mode = textTrack.language === activeLanguage ? "showing" : "disabled"; }} />)}</video>
    {!playback.playing && !buffering && <button aria-label={canControl ? "Play film" : "Waiting for host"} className="center-play" onClick={toggle} disabled={!canControl}><Play size={28} fill="currentColor" /></button>}
    {buffering && <div className="player-loading" role="status"><LoaderCircle size={28} className="spin" /><span>Finding your frame…</span></div>}
    {error && <div className="player-error" role="alert">{error}<button onClick={error.startsWith("Your browser needs") ? allowPlayback : reload}>{error.startsWith("Your browser needs") ? "Tap to Start Watching" : "Reload media"}</button></div>}
    <button type="button" className="player-controls-toggle" aria-label={controlsVisible ? "Hide player controls" : "Show player controls"} aria-pressed={!controlsVisible} onClick={() => setControlsVisible(!controlsVisible)}>{controlsVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    {children}
    <GlassPlayerControls ref={controls}><div className="seek-line"><input type="range" aria-label="Seek film" min="0" max={playback.duration} step=".1" value={Math.min(position, playback.duration)} disabled={!canControl} onChange={e => onControl("seek", Number(e.target.value))} /></div><div className="controls-row"><button aria-label={playback.playing ? "Pause film" : "Play film"} disabled={!canControl} onClick={toggle}>{playback.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><span className="player-time">{formatTime(position)} <span>/ {formatTime(playback.duration)}</span></span><span className="host-control-label">{isSolo ? "YOUR SCREENING" : canControl ? publicTheater ? "MODERATOR CONTROLS" : "YOU’RE THE HOST" : publicTheater ? "SYNCHRONIZED SCREENING" : "HOST CONTROLS PLAYBACK"}</span><button aria-label={muted ? "Unmute audio" : "Mute audio"} onClick={audioToggle}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" className="volume-slider" aria-label="Volume" min="0" max="1" step=".05" value={volume} onChange={e => { const value = Number(e.target.value); setVolume(value); if (video.current) { video.current.volume = value; video.current.muted = value === 0; setMuted(value === 0); } }} />{levels.length > 1 && <select className="quality-select" aria-label="Video quality" value={quality} onChange={event => { const value = Number(event.target.value); setQuality(value); if (hlsInstance.current) hlsInstance.current.currentLevel = value; }}><option value={-1}>Auto</option>{levels.map(level => <option key={level.index} value={level.index}>{level.height}p</option>)}</select>}{subtitleTracks.length > 0 && <button aria-label="Toggle subtitles" aria-pressed={activeLanguage !== "off"} onClick={toggleCaptions}><Captions size={18} /></button>}{subtitleTracks.length > 1 && <select className="subtitle-select" aria-label="Subtitle language" value={activeLanguage} onChange={event => setCaptionLanguage(event.target.value)}><option value="off">Subtitles off</option>{subtitleTracks.map(track => <option key={track.language} value={track.language}>{track.label}</option>)}</select>}<button aria-label="Fullscreen" onClick={() => { void fullscreen(); }}><Maximize size={18} /></button></div></GlassPlayerControls>
  </div>;
}
