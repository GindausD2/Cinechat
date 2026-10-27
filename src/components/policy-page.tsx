import Link from "next/link";
import { POLICY_VERSION } from "@/lib/privacy";
export function PolicyPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="page-container legal-copy"><span className="eyebrow">CINECHAT · TRUST & TRANSPARENCY</span><h1>{title}</h1><p className="muted">Policy version {POLICY_VERSION} · Updated 22 October 2026</p><nav className="policy-nav" aria-label="Policies"><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/cookies">Cookies</Link><Link href="/legal/refunds">Free service</Link><Link href="/legal/safety">Safety</Link><Link href="/legal#artwork">Asset credits</Link><Link href="/contact">Contact</Link></nav>{children}</section>;
}
