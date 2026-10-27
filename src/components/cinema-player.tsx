"use client";
import { useEffect, useRef, useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Captions, LoaderCircle, Eye, EyeOff, Settings2 } from "lucide-react";
import type Hls from "hls.js";
import { useCookiePreferences } from "./cookie-preferences";
import { isLocalImage, isExternalImage } from "@/lib/cookie-preferences";
import type { Subtitle } from "@/lib/media";
import { driftCorrection } from "@/lib/playback";
import { GlassPlayerControls, GlassModal } from "./glass";
export type ClientPlayback = { playing: boolean; position: number; version: number; serverTime: number; duration: number };
function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function applySubtitleLanguage(element: HTMLVideoElement | null, language: string) {
  if (element) for (const track of element.textTracks) track.mode = track.language === language ? "showing" : "disabled";
}
/** Preserve authored cue positions; reserve space only for automatically placed cues. */
function positionAutomaticCues(element: HTMLVideoElement | null, controls: HTMLDivElement | null, defaults: WeakSet<TextTrackCue>) {
  if (!element || !controls || typeof VTTCue === "undefined") return;
  const style = getComputedStyle(controls), bounds = controls.getBoundingClientRect();
  const overlay = style.position === "absolute" && bounds.height > 0 && !controls.parentElement?.classList.contains("auto-controls-hidden");
  const font = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const lineHeight = Math.max(font * .875, Math.min(element.getBoundingClientRect().width * .02, font * 1.375)) * 1.4;
  const lines = Math.min(12, Math.max(3, Math.ceil((bounds.height + (parseFloat(style.bottom) || 0) + 16) / lineHeight) + 1));
  for (const track of element.textTracks) for (const cue of Array.from(track.cues || [])) {
    if (!(cue instanceof VTTCue) || !cue.snapToLines || (!defaults.has(cue) && cue.line !== "auto")) continue;
    defaults.add(cue); const line = overlay ? -lines : "auto"; if (cue.line !== line) cue.line = line;
  }
}
export type PlayerMedia = { url: string; format: string; subtitleUrl: string | null; subtitles?: Subtitle[] };
export function CinemaPlayer({ media, playback, canControl, onControl, movieId, clockOffset = 0, isSolo = false, publicTheater = false, poster, children }: { media: PlayerMedia; playback: ClientPlayback; canControl: boolean; onControl: (action: "play" | "pause" | "seek", position?: number) => void; movieId: string; clockOffset?: number; isSolo?: boolean; publicTheater?: boolean; poster?: string; children?: ReactNode }) {
  const hlsInstance = useRef<Hls | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const automaticCues = useRef(new WeakSet<TextTrackCue>());
  const [revision, setRevision] = useState(0), [levels, setLevels] = useState<{ index: number; height: number }[]>([]), [quality, setQuality] = useState(-1), [captionLanguage, setCaptionLanguage] = useState("off"), [controlsVisible, setControlsVisible] = useState(true), [expanded, setExpanded] = useState(false);
  const subtitleTracks = media.subtitles || (media.subtitleUrl ? [{ language: "en", label: "English", url: media.subtitleUrl }] : []);
  const activeLanguage = subtitleTracks.some(track => track.language === captionLanguage) ? captionLanguage : "off";
  const video = useRef<HTMLVideoElement>(null), shell = useRef<HTMLDivElement>(null), controls = useRef<HTMLDivElement>(null), received = useRef(playback);
  const savedProgress = useRef({ position: -1, at: -Infinity });
  const [position, setPosition] = useState(playback.position), [muted, setMuted] = useState(true), [volume, setVolume] = useState(.7), [buffering, setBuffering] = useState(true), [error, setError] = useState("");
  const automaticHidden = autoHidden && playback.playing && controlsVisible && !settingsOpen && !error;
  useEffect(() => {
    const element = shell.current; if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined, dragging = false;
    const reveal = () => {
      setAutoHidden(false); clearTimeout(timer);
      if (!playback.playing || settingsOpen || !controlsVisible || error) return;
      timer = setTimeout(() => {
        const focused = document.activeElement;
        if (dragging || (focused instanceof HTMLElement && element.contains(focused) && focused.matches(":focus-visible"))) return;
        // In-flow phone controls remain stable below the picture; only overlays fade.
        if (controls.current && getComputedStyle(controls.current).position === "absolute") setAutoHidden(true);
      }, 3000);
    };
    const down = () => { dragging = true; reveal(); }, up = () => { dragging = false; reveal(); };
    const frame = requestAnimationFrame(reveal);
    element.addEventListener("pointermove", reveal); element.addEventListener("pointerdown", down);
    element.addEventListener("keydown", reveal); element.addEventListener("focusin", reveal); element.addEventListener("focusout", reveal);
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); window.addEventListener("resize", reveal); window.addEventListener("cinechat:viewport-layout", reveal);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); element.removeEventListener("pointermove", reveal); element.removeEventListener("pointerdown", down); element.removeEventListener("keydown", reveal); element.removeEventListener("focusin", reveal); element.removeEventListener("focusout", reveal); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); window.removeEventListener("resize", reveal); window.removeEventListener("cinechat:viewport-layout", reveal); };
  }, [playback.playing, settingsOpen, controlsVisible, error]);
  const persistProgress = useCallback((force = false) => {
    const element = video.current; if (!element || element.currentTime <= 0) return;
    const position = Math.min(element.currentTime, playback.duration), now = performance.now(), previous = savedProgress.current;
    if ((!force && now - previous.at < 20000) || (Math.abs(previous.position - position) < .1 && now - previous.at < 20000)) return;
    savedProgress.current = { position, at: now };
    void fetch("/api/history", { method: "POST", keepalive: force, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId, position }) }).catch(() => {});
  }, [movieId, playback.duration]);
  useEffect(() => {
    const flush = () => persistProgress(true);
    const hidden = () => { if (document.hidden) flush(); };
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", hidden);
    return () => { flush(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", hidden); };
  }, [persistProgress]);
  const playFailure = useCallback((failure: unknown) => {
    if (failure instanceof DOMException && failure.name === "AbortError") return;
    setError(failure instanceof DOMException && failure.name === "NotAllowedError" ? "Your browser needs a tap to join this screening." : "Playback could not start. Reload the media to recover your place.");
  }, []);
  useEffect(() => {
    const element = controls.current; if (!element) return;
    const measure = () => { const inset = parseFloat(getComputedStyle(element).bottom) || 0; shell.current?.style.setProperty("--controls-height", `${element.getBoundingClientRect().height + inset}px`); positionAutomaticCues(video.current, element, automaticCues.current); };
    const observer = new ResizeObserver(measure); observer.observe(element); if (video.current) observer.observe(video.current); measure(); return () => observer.disconnect();
  }, []);
  useEffect(() => { applySubtitleLanguage(video.current, activeLanguage); positionAutomaticCues(video.current, controls.current, automaticCues.current); }, [activeLanguage, media.url, revision, automaticHidden, controlsVisible, expanded]);
  useEffect(() => {
    const element = video.current; if (!element) return;
    let frame = 0;
    const position = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => positionAutomaticCues(element, controls.current, automaticCues.current)); };
    const nodes = Array.from(element.querySelectorAll("track")), tracks = Array.from(element.textTracks);
    for (const node of nodes) node.addEventListener("load", position);
    for (const track of tracks) track.addEventListener("cuechange", position);
    element.textTracks.addEventListener("change", position); position();
    return () => { cancelAnimationFrame(frame); for (const node of nodes) node.removeEventListener("load", position); for (const track of tracks) track.removeEventListener("cuechange", position); element.textTracks.removeEventListener("change", position); };
  }, [activeLanguage, media.url, revision]);
  useEffect(() => {
    const element = video.current; if (!element) return;
    let hls: Hls | null = null, disposed = false; let recoveries = 0;
    async function initialize() {
      if (!element) return;
      const nativeHls = Boolean(element.canPlayType("application/vnd.apple.mpegurl"));
      const mediaSource = typeof MediaSource !== "undefined" || "ManagedMediaSource" in window;
      // Preserve rendition selection on MediaSource browsers; native-only browsers avoid the library.
      if (media.format === "hls" && (!nativeHls || mediaSource)) {
        const { default: Hls } = await import(/* webpackChunkName: "hls-player" */ "hls.js");
        if (disposed) return;
        if (!Hls.isSupported()) { if (nativeHls) element.src = media.url; else element.dispatchEvent(new Event("error")); return; }
        hls = new Hls(); hlsInstance.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => { setLevels(data.levels.map((level, index) => ({ index, height: level.height }))); setQuality(-1); });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (recoveries < 2 && data.type === Hls.ErrorTypes.NETWORK_ERROR) { recoveries++; setBuffering(true); hls?.startLoad(); }
          else if (recoveries < 2 && data.type === Hls.ErrorTypes.MEDIA_ERROR) { recoveries++; setBuffering(true); hls?.recoverMediaError(); }
          else { setBuffering(false); setError("The stream was interrupted. Reload to recover your place in the screening."); }
        });
        hls.loadSource(media.url); hls.attachMedia(element);
      } else element.src = media.url;
    }
    void initialize().catch(() => { if (!disposed) { setBuffering(false); setError("The player could not load. Reload the media to try again."); } });
    return () => { disposed = true; hls?.destroy(); hlsInstance.current = null; element.pause(); element.removeAttribute("src"); element.load(); };
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
    const previous = document.body.style.overflow, focus = document.activeElement;
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement | null = shell.current;
    while (branch?.parentElement) {
      for (const element of Array.from(branch.parentElement.children)) if (element instanceof HTMLElement && element !== branch && !element.matches("script,style")) { siblings.push({ element, inert: element.inert }); element.inert = true; }
      branch = branch.parentElement; if (branch === document.body) break;
    }
    document.body.style.overflow = "hidden";
    shell.current?.querySelector<HTMLButtonElement>(".player-controls-toggle")?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (shell.current?.querySelector("dialog[open]")) return;
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); }
      if (event.key !== "Tab") return;
      const targets = Array.from(shell.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[href],[tabindex="0"]') || []).filter(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && (document.activeElement === first || !shell.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !shell.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previous; for (const { element, inert } of siblings) element.inert = inert; document.removeEventListener("keydown", keyboard); if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true }); };
  }, [expanded]);
  useEffect(() => {
    const adaptFullscreen = () => {
      if (document.documentElement.dataset.screenSegments && document.fullscreenElement === shell.current) {
        void document.exitFullscreen().then(() => { if (shell.current?.isConnected) setExpanded(true); }).catch(() => {});
      }
    };
    window.addEventListener("cinechat:viewport-layout", adaptFullscreen);
    return () => window.removeEventListener("cinechat:viewport-layout", adaptFullscreen);
  }, []);
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
    if (document.documentElement.dataset.screenSegments) { setExpanded(true); return; }
    try { if (!shell.current?.requestFullscreen) throw new Error(); await shell.current.requestFullscreen(); }
    catch { setExpanded(true); }
  }
  function onTimeUpdate() {
    const element = video.current; if (!element) return; setPosition(element.currentTime);
    persistProgress();
  }
  function mediaReady() {
    setBuffering(false);
    // A recovered source must not remain behind an obsolete error overlay.
    if (!video.current?.error) setError(current => current.startsWith("Your browser needs") ? current : "");
    restoreTimeline();
  }
  function mediaError() {
    // HLS owns bounded network/decoder recovery and reports an unrecoverable error itself.
    if (hlsInstance.current) return;
    setBuffering(false); setError("The media could not be loaded. Check the source or try again.");
  }
  function audioToggle() { const element = video.current; if (!element) return; element.muted = !muted; element.volume = volume; setMuted(!muted); }
  function toggleCaptions() { setCaptionLanguage(activeLanguage === "off" ? subtitleTracks[0]?.language || "off" : "off"); }
  function toggle() {
    setError("");
    if (canControl) onControl(playback.playing ? "pause" : "play", video.current?.currentTime ?? position);
    else if (playback.playing) void video.current?.play().catch(playFailure);
  }
  function chooseQuality(value: number) { setQuality(value); if (hlsInstance.current) hlsInstance.current.currentLevel = value; }
  const { externalImages } = useCookiePreferences();
  const safePoster = poster && (isLocalImage(poster) || (externalImages && isExternalImage(poster))) ? poster : undefined;
  // eslint-disable-next-line jsx-a11y/media-has-caption -- Render caption tracks only when the authorized source supplies them.
  return <div className={`player-shell ${expanded ? "is-expanded" : ""} ${automaticHidden ? "auto-controls-hidden" : ""} ${controlsVisible ? "" : "controls-hidden"} ${error ? "has-error" : ""} ${children ? "has-reactions" : ""}`} ref={shell} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "Fullscreen cinema" : undefined}><video ref={video} data-testid="cinema-video" poster={safePoster} crossOrigin="anonymous" muted={muted} playsInline preload="metadata" onTimeUpdate={onTimeUpdate} onPause={() => persistProgress(true)} onLoadedMetadata={() => { if (!received.current.playing) setBuffering(false); restoreTimeline(); }} onLoadStart={() => setBuffering(true)} onWaiting={() => setBuffering(true)} onCanPlay={mediaReady} onPlaying={() => { setBuffering(false); setError(current => current.startsWith("Your browser needs") ? "" : current); }} onError={mediaError} onEnded={() => { persistProgress(true); if (canControl) onControl("pause", playback.duration); }} aria-label="Cinema video">{subtitleTracks.map(track => <track key={`${track.language}-${track.url}`} kind="subtitles" src={track.url} srcLang={track.language} label={track.label} onLoad={() => { applySubtitleLanguage(video.current, activeLanguage); positionAutomaticCues(video.current, controls.current, automaticCues.current); }} />)}</video>
    {!playback.playing && !buffering && <button aria-label={canControl ? "Play film" : "Waiting for host"} className="center-play" onClick={toggle} disabled={!canControl}><Play size={28} fill="currentColor" /></button>}
    {buffering && <div className="player-loading" role="status"><LoaderCircle size={28} className="spin" /><span>Finding your frame…</span></div>}
    {error && <div className="player-error" role="alert">{error}<button onClick={error.startsWith("Your browser needs") ? allowPlayback : reload}>{error.startsWith("Your browser needs") ? "Tap to Start Watching" : "Reload media"}</button></div>}
    <button type="button" className="player-controls-toggle" aria-label={controlsVisible ? "Hide player controls" : "Show player controls"} aria-pressed={!controlsVisible} onClick={() => setControlsVisible(!controlsVisible)}>{controlsVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    {children}
    <GlassPlayerControls ref={controls}><div className="seek-line"><input type="range" aria-label="Seek film" style={{ "--range-progress": `${Math.max(0, Math.min(100, position / Math.max(1, playback.duration) * 100))}%` } as CSSProperties} min="0" max={playback.duration} step=".1" value={Math.min(position, playback.duration)} disabled={!canControl} onChange={e => onControl("seek", Number(e.target.value))} /></div><div className={`controls-row ${levels.length > 1 ? "has-quality" : ""}`}><button aria-label={playback.playing ? "Pause film" : "Play film"} disabled={!canControl} onClick={toggle}>{playback.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><span className="player-time">{formatTime(position)} <span>/ {formatTime(playback.duration)}</span></span><span className="host-control-label">{isSolo ? "YOUR SCREENING" : canControl ? publicTheater ? "MODERATOR CONTROLS" : "YOU’RE THE HOST" : publicTheater ? "SYNCHRONIZED SCREENING" : "HOST CONTROLS PLAYBACK"}</span><button aria-label={muted ? "Unmute audio" : "Mute audio"} onClick={audioToggle}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" className="volume-slider" aria-label="Volume" style={{ "--range-progress": `${volume * 100}%` } as CSSProperties} min="0" max="1" step=".05" value={volume} onChange={e => { const value = Number(e.target.value); setVolume(value); if (video.current) { video.current.volume = value; video.current.muted = value === 0; setMuted(value === 0); } }} /><span className="player-source-options">{levels.length > 1 && <select className="quality-select" aria-label="Video quality" value={quality} onChange={event => chooseQuality(Number(event.target.value))}><option value={-1}>Auto</option>{levels.map(level => <option key={level.index} value={level.index}>{level.height}p</option>)}</select>}{subtitleTracks.length > 0 && <button aria-label="Toggle subtitles" aria-pressed={activeLanguage !== "off"} onClick={toggleCaptions}><Captions size={18} /></button>}{subtitleTracks.length > 1 && <select className="subtitle-select" aria-label="Subtitle language" value={activeLanguage} onChange={event => setCaptionLanguage(event.target.value)}><option value="off">Subtitles off</option>{subtitleTracks.map(track => <option key={track.language} value={track.language}>{track.label}</option>)}</select>}</span>{(levels.length > 1 || subtitleTracks.length > 0) && <button className="player-settings-toggle" aria-label="Playback settings" aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><Settings2 size={18} /></button>}<button aria-label="Fullscreen" onClick={() => { void fullscreen(); }}><Maximize size={18} /></button></div></GlassPlayerControls>
    <GlassModal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Playback settings">{settingsOpen && <div className="form-stack player-settings-dialog"><p>These settings affect only your screen.</p>
      {levels.length > 1 && <label>Video quality<select aria-label="Video quality" value={quality} onChange={event => chooseQuality(Number(event.target.value))}><option value={-1}>Auto</option>{levels.map(level => <option key={level.index} value={level.index}>{level.height}p</option>)}</select></label>}
      {subtitleTracks.length > 0 && <label>Subtitles<select aria-label="Subtitle language" value={activeLanguage} onChange={event => setCaptionLanguage(event.target.value)}><option value="off">Subtitles off</option>{subtitleTracks.map(track => <option key={track.language} value={track.language}>{track.label}</option>)}</select></label>}
    </div>}</GlassModal>
  </div>;
}
