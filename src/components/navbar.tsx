"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Radio, Bookmark, UserRound, Home, Bell, Clapperboard } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { Avatar } from "./avatar";

export function GlassNavbar({ user }: { user: { username: string; image: string | null } | null }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/movies", label: "Movies", icon: Clapperboard },
    { href: "/cinemas", label: "Live Cinemas", icon: Radio },
    { href: "/watchlist", label: "My List", icon: Bookmark }
  ];
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const profileHref = user ? `/profile/${user.username}` : "/login";
  return <>
    <header className="navbar">
      <Link href="/" className="brand" aria-label="CineChat home"><span className="brand-mark" aria-hidden="true"><span /></span>CineChat</Link>
      <nav className="desktop-nav" aria-label="Main navigation">{items.map(item => <Link key={item.href} className={active(item.href) ? "active" : ""} aria-current={active(item.href) ? "page" : undefined} href={item.href}>{item.label}</Link>)}</nav>
      <div className="nav-actions">
        <Link href="/movies" aria-label="Search movies" title="Search" className="icon-button nav-search"><Search size={20} /></Link>
        <Link href={user ? "/notifications" : "/login"} aria-label="Notifications" title="Notifications" className="icon-button nav-notifications"><Bell size={20} /></Link>
        <ThemeSwitcher />
        <Link href={profileHref} className="profile-link" aria-label={user ? "Your profile" : "Sign in"} title={user ? "Your profile" : "Sign in"}>{user ? <Avatar name={user.username} image={user.image} /> : <span className="avatar"><UserRound size={18} /></span>}</Link>
      </div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation">{[...items, { href: profileHref, label: "Profile", icon: UserRound }].map(item => <Link key={item.label} href={item.href} className={active(item.href) ? "active" : ""} aria-current={active(item.href) ? "page" : undefined}><item.icon size={21} /><span>{item.label === "Live Cinemas" ? "Cinemas" : item.label}</span></Link>)}</nav>
  </>;
}
