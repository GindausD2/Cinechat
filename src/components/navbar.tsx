"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Search, Radio, Bookmark, UserRound, Home, Bell, Clapperboard } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { Avatar } from "./avatar";

/** Correct browser focus scrolling without scrolling messages or replacing media. */
function keepComposerVisible(field: HTMLElement, header: HTMLElement | null, navigation: HTMLElement | null, sticky: number) {
  const viewport = window.visualViewport, root = document.documentElement, bounds = field.getBoundingClientRect();
  const pane = field.closest(".glass-chat-panel")?.querySelector(".chat-messages")?.getBoundingClientRect();
  const top = Math.max(viewport?.offsetTop || 0, header?.getBoundingClientRect().bottom || 0) + sticky + 8;
  let bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight);
  if (root.dataset.screenSegments) bottom = Math.min(bottom, parseFloat(root.style.getPropertyValue("--screen-safe-y")) + parseFloat(root.style.getPropertyValue("--screen-safe-height")));
  if (navigation && getComputedStyle(navigation).visibility !== "hidden") {
    const nav = navigation.getBoundingClientRect();
    if (nav.height && bounds.left < nav.right && bounds.right > nav.left) bottom = Math.min(bottom, nav.top);
  }
  let preferred = Math.min(0, bounds.top - top);
  if (sticky && pane) preferred = Math.min(preferred, pane.bottom - Math.min(180, pane.height) - top);
  // On short keyboard viewports the composer takes priority over a full message.
  const delta = Math.max(bounds.bottom - (bottom - 12), preferred);
  if (Math.abs(delta) < 1) return;
  const shell = document.querySelector<HTMLElement>(".viewport-shell");
  if (shell && getComputedStyle(shell).position === "fixed") shell.scrollTop += delta;
  else window.scrollBy({ top: delta, behavior: "instant" });
}

export function GlassNavbar({ user }: { user: { username: string; image: string | null } | null }) {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null), mobile = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement, viewport = window.visualViewport, active = document.activeElement;
        const editing = active instanceof HTMLElement && (active.matches('input:not([type="checkbox"]):not([type="range"]):not([type="button"]),textarea,select') || active.isContentEditable);
        const keyboard = editing && ((viewport?.height || innerHeight) < innerHeight * .75 || innerHeight < 450);
        root.dataset.keyboardOpen = keyboard ? "true" : "false";
        const availableWidth = header.current?.getBoundingClientRect().width || innerWidth;
        root.dataset.navigationLayout = availableWidth < 320 ? "cover" : availableWidth <= 700 ? "compact" : availableWidth <= 1100 ? "tablet" : "desktop";
        root.style.setProperty("--header-height", `${header.current?.getBoundingClientRect().height || 0}px`);
        root.style.setProperty("--mobile-nav-height", `${keyboard ? 0 : mobile.current?.getBoundingClientRect().height || 0}px`);
        root.style.setProperty("--visual-viewport-height", `${viewport?.height || innerHeight}px`);
        root.style.setProperty("--keyboard-overlap", `${Math.max(0, innerHeight - (viewport?.height || innerHeight) - (viewport?.offsetTop || 0))}px`);
        const player = document.querySelector<HTMLElement>(".theater-private .player-shell");
        const playerHeight = player?.getBoundingClientRect().height || 0;
        root.dataset.cinemaPin = player && (viewport?.height || innerHeight) - (header.current?.getBoundingClientRect().height || 0) - playerHeight >= 72 ? "true" : "false";
        const sticky = player && getComputedStyle(player).position === "sticky" ? playerHeight + 8 : 0;
        root.style.setProperty("--sticky-cinema-height", `${sticky}px`);
        if (editing && active instanceof HTMLElement && active.closest(".chat-compose")) {
          keepComposerVisible(active, header.current, mobile.current, sticky);
        } else if (keyboard && active instanceof HTMLElement) {
          const bounds = active.getBoundingClientRect(), top = (viewport?.offsetTop || 0) + (header.current?.getBoundingClientRect().height || 0) + 8, bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - 12;
          const chatTop = active.closest(".chat-compose") ? top + sticky : top;
          if (bounds.bottom > bottom || bounds.top < chatTop) active.scrollIntoView({ block: "nearest", behavior: "instant" });
        }
      });
    };
    const observer = new ResizeObserver(update);
    if (header.current) observer.observe(header.current); if (mobile.current) observer.observe(mobile.current);
    window.addEventListener("resize", update); window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("cinechat:viewport-layout", update);
    document.addEventListener("focusin", update); document.addEventListener("focusout", update); update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); window.removeEventListener("cinechat:viewport-layout", update); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); };
  }, []);
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/movies", label: "Movies", icon: Clapperboard },
    { href: "/cinemas", label: "Live Cinemas", icon: Radio },
    { href: "/watchlist", label: "My List", icon: Bookmark }
  ];
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const profileHref = user ? `/profile/${user.username}` : "/login";
  return <>
    <header className="navbar" ref={header}>
      <Link href="/" className="brand" aria-label="CineChat home"><span className="brand-mark" aria-hidden="true"><span /></span>CineChat</Link>
      <nav className="desktop-nav" aria-label="Main navigation">{items.map(item => <Link key={item.href} className={active(item.href) ? "active" : ""} aria-current={active(item.href) ? "page" : undefined} href={item.href}>{item.label}</Link>)}</nav>
      <div className="nav-actions">
        <Link href="/movies" aria-label="Search movies" title="Search" className="icon-button nav-search"><Search size={20} /></Link>
        <Link href={user ? "/notifications" : "/login"} aria-label="Notifications" title="Notifications" className="icon-button nav-notifications"><Bell size={20} /></Link>
        <ThemeSwitcher />
        <Link href={profileHref} className="profile-link" aria-label={user ? "Your profile" : "Sign in"} title={user ? "Your profile" : "Sign in"}>{user ? <Avatar name={user.username} image={user.image} /> : <span className="avatar"><UserRound size={18} /></span>}</Link>
      </div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation" ref={mobile}>{[...items, { href: profileHref, label: "Profile", icon: UserRound }].map(item => <Link key={item.label} href={item.href} className={active(item.href) ? "active" : ""} aria-current={active(item.href) ? "page" : undefined}><item.icon size={21} /><span>{item.label === "Live Cinemas" ? "Cinemas" : item.label}</span></Link>)}</nav>
  </>;
}
