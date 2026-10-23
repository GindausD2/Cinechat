import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "./globals.css";
import { GlassNavbar } from "@/components/navbar";
import { currentUser } from "@/lib/session";
import { CookiePreferencesProvider, CookiePreferencesButton } from "@/components/cookie-preferences";
import { themeInitialization } from "@/lib/theme";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "CineChat · Every film, a shared feeling", template: "%s · CineChat" }, description: "Discover independent cinema and watch licensed films together in your own social cinema." };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitialization }} /></head><body><a className="skip-link" href="#main">Skip to content</a><CookiePreferencesProvider><GlassNavbar user={user ? { username: user.profile?.username || "me", image: user.image } : null} /><main id="main">{children}</main><footer><Link href="/" className="brand">CineChat</Link><span className="muted">Every film, a shared feeling.</span><div><Link href="/clubs">Movie clubs</Link><Link href="/cinemas">Theaters</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/legal">Rights & credits</Link><Link href="/contact">Contact</Link><CookiePreferencesButton /></div><small>© {new Date().getFullYear()} CineChat</small></footer></CookiePreferencesProvider></body></html>;
}
