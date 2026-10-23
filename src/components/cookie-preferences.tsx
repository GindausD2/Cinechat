"use client";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { COOKIE_PREFERENCE_KEY, makeCookiePreferences, parseCookiePreferences } from "@/lib/cookie-preferences";
import { GlassButton, GlassModal } from "./glass";
const eventName = "cinechat:cookies";
let fallback = "";
function snapshot() {
  let value = fallback;
  try { value = localStorage.getItem(COOKIE_PREFERENCE_KEY) || ""; } catch { /* Storage may be disabled. */ }
  return parseCookiePreferences(value) ? value : "";
}
function subscribe(notify: () => void) {
  const timer = setInterval(notify, 60000);
  window.addEventListener(eventName, notify); window.addEventListener("storage", notify);
  return () => { clearInterval(timer); window.removeEventListener(eventName, notify); window.removeEventListener("storage", notify); };
}
function persist(externalImages: boolean) {
  fallback = JSON.stringify(makeCookiePreferences(externalImages));
  try { localStorage.setItem(COOKIE_PREFERENCE_KEY, fallback); } catch { /* Keep the choice in this page's memory. */ }
  window.dispatchEvent(new Event(eventName));
}
const Context = createContext({ externalImages: false, openPreferences: () => {}, requestOptionalImages: () => {} });
export function useCookiePreferences() { return useContext(Context); }
export function CookiePreferencesProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const preferences = useMemo(() => parseCookiePreferences(raw), [raw]);
  const [open, setOpen] = useState(false), [needsChoice, setNeedsChoice] = useState(false), [external, setExternal] = useState(false);
  const requestOptionalImages = useCallback(() => setNeedsChoice(true), []);
  const openPreferences = useCallback(() => { setExternal(preferences?.externalImages || false); setOpen(true); }, [preferences]);
  const save = (value: boolean) => { persist(value); setNeedsChoice(false); setOpen(false); };
  const context = useMemo(() => ({ externalImages: preferences?.externalImages || false, openPreferences, requestOptionalImages }), [preferences, openPreferences, requestOptionalImages]);
  return <Context.Provider value={context}>{children}
    {needsChoice && !preferences && !open && <aside className="cookie-banner" aria-label="Optional image privacy choices"><div><h2>Your choice of external images</h2><p>This page includes images hosted by other services. Loading them shares your network address with those hosts. They stay hidden until you choose. CineChat uses no analytics or advertising cookies. <Link href="/legal/cookies" onClick={() => setNeedsChoice(false)}>Cookie & storage details</Link></p></div><div className="button-row"><GlassButton onClick={() => save(true)}>Accept optional images</GlassButton><GlassButton onClick={() => save(false)}>Reject optional images</GlassButton><GlassButton onClick={openPreferences}>Customize preferences</GlassButton></div></aside>}
    <GlassModal open={open} onClose={() => setOpen(false)} title="Cookie & privacy preferences"><div className="form-stack"><p>Essential sign-in and security cookies keep your account working. Theme and privacy choices are stored on this device. No analytics, advertising, or marketing trackers are installed.</p><p><strong>Essential storage: always enabled</strong><br /><small>You can clear it in your browser; clearing sign-in cookies signs you out.</small></p><label className="checkbox">Allow external images<input type="checkbox" checked={external} onChange={event => setExternal(event.target.checked)} /></label><p className="muted">Optional avatars and catalog images from other hosts may disclose your IP address. Requests omit referrer information and cross-site credentials. Licensed video delivery contacts its configured provider when you choose to watch; it is part of the requested service.</p><Link href="/legal/cookies" onClick={() => setOpen(false)}>Read the Cookie Policy</Link><div className="button-row"><GlassButton onClick={() => save(external)}>Save preferences</GlassButton><GlassButton onClick={() => save(false)}>Reject optional images</GlassButton></div></div></GlassModal>
  </Context.Provider>;
}
export function CookiePreferencesButton() {
  const { openPreferences } = useCookiePreferences();
  return <button type="button" className="footer-preferences" onClick={openPreferences}>Cookie preferences</button>;
}
