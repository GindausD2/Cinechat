import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { hashToken } from "@/lib/security";
import { JoinRoom } from "@/components/join-room";
export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; if (token.length < 32 || token.length > 100) notFound();
  const user = await currentUser();
  if (!user) return <section className="page-container empty-state"><Lock size={28} className="mx-auto mb-4" /><h1>A private invitation.</h1><p>Sign in, then reopen this invitation to take your seat.</p><Link href="/login" className="button button-primary">Sign in</Link></section>;
  const invitation = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { room: { select: { title: true, accessCodeHash: true, endedAt: true } } } });
  if (!invitation || invitation.revoked || invitation.expiresAt <= new Date() || invitation.uses >= invitation.maxUses || invitation.room.endedAt) notFound();
  return <section className="page-container max-w-lg"><div className="glass-card"><span className="eyebrow">YOUR NAME’S ON THE LIST</span><h1 className="text-3xl">You’re invited.</h1><p className="muted">Take a seat in “{invitation.room.title}”.</p><JoinRoom roomId={invitation.roomId} token={token} requiresCode={Boolean(invitation.room.accessCodeHash)} /><small className="muted block mt-5">This invitation expires after 24 hours and has a limited number of uses.</small></div></section>;
}
