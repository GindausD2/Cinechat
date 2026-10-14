"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, Radio, Bookmark, UserRound, Home, Bell } from "lucide-react";
export function GlassNavbar({ user }: { user: { username: string; image: string | null } | null }) {
  const pathname = usePathname();
  const items = [{ href: "/", label: "Home", icon: Home }, { href: "/movies", label: "Movies", icon: Film }, { href: "/cinemas", label: "Live Cinemas", icon: Radio }, { href: "/watchlist", label: "Watchlist", icon: Bookmark }, { href: user ? `/profile/${user.username}` : "/login", label: "Profile", icon: UserRound }];
  return <>
    <header className="navbar glass"><Link href="/" className="brand" aria-label="CineChat home"><span className="brand-symbol"><Film size={22} /></span>Cine<span>Chat</span><span className="brand-dot" /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{items.map(item => <Link key={item.label} className={pathname === item.href ? "active" : ""} href={item.href}>{item.label}</Link>)}</nav>
      <div className="nav-actions"><Link href="/movies" aria-label="Search movies" className="icon-button"><Search size={20} /></Link><Link href={user ? "/notifications" : "/login"} aria-label="Notifications" className="icon-button"><Bell size={20} /></Link><Link href={user ? "/settings" : "/login"} className="avatar" aria-label={user ? "Account settings" : "Sign in"}>{user?.username.slice(0, 2).toUpperCase() || <UserRound size={18} />}</Link></div>
    </header>
    <nav className="mobile-nav glass" aria-label="Mobile navigation">{items.map(item => <Link key={item.label} href={item.href} className={pathname === item.href ? "active" : ""}><item.icon size={19} /><span>{item.label === "Live Cinemas" ? "Cinemas" : item.label}</span></Link>)}</nav>
  </>;
}
