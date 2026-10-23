import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { hasPolicyAcceptance } from "@/lib/policy-acceptance";
import { safeReturnPath } from "@/lib/return-path";
import { PolicyAcknowledgement } from "@/components/policy-acknowledgement";
export const metadata = { title: "Review account policies", robots: { index: false, follow: false } };
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
 const returnTo = safeReturnPath((await searchParams).returnTo);
 const user = await currentUser(); if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)}`);
 const destination = user.profile?.birthDate ? returnTo : `/settings?returnTo=${encodeURIComponent(returnTo)}`;
 if (await hasPolicyAcceptance(user.id)) redirect(destination);
 return <section className="page-container legal-copy"><span className="eyebrow">BEFORE YOUR FIRST SCREENING</span><h1>Review your account policies.</h1><p>Read the Terms and Privacy Policy before creating or joining a theater. Optional images and marketing are separate choices; no marketing program is enabled. New profiles remain private.</p><PolicyAcknowledgement returnTo={destination} /><p className="muted mt-6">You can still manage, export or delete your account in <Link href="/settings">settings</Link> without accepting these policies.</p></section>;
}
