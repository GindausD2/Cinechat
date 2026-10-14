import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ActionButton } from "@/components/action-button";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await currentUser(); const club = await db.movieClub.findUnique({ where: { id }, include: { _count: { select: { memberships: true } } } }); if (!club) notFound();
  const joined = user ? await db.clubMembership.findUnique({ where: { clubId_userId: { clubId: id, userId: user.id } } }) : null;
  const members = await db.clubMembership.findMany({ where: { clubId: id, user: { suspended: false, profile: { publicProfile: true } } }, select: { user: { select: { id: true, name: true, profile: { select: { username: true } } } } }, take: 50 });
  return <section className="page-container"><div className="profile-cover"><div className="club-emblem"><Users size={38} /></div><div><span className="eyebrow">{club.genre.toUpperCase()}</span><h1>{club.name}</h1><p className="muted">{club.description}</p><span className="pill">{club._count.memberships} members</span></div>{user ? <ActionButton endpoint="/api/clubs" body={{ action: joined ? "leave" : "join", clubId: id }} variant={joined ? "glass" : "primary"}>{joined ? "Leave club" : "Join club"}</ActionButton> : <Link href="/login" className="button button-primary">Sign in to join</Link>}</div><div className="section-header"><h2>The club community</h2>{joined && <Link href="/cinemas/new">Plan a screening →</Link>}</div><div className="people-grid">{members.map(m => <Link key={m.user.id} href={`/profile/${m.user.profile?.username}`} className="glass-card person-card"><span className="avatar">{m.user.name?.slice(0,2).toUpperCase()}</span><strong>@{m.user.profile?.username}</strong></Link>)}</div><p className="muted text-xs mt-6">Members with private profiles are included in the count and hidden from this directory.</p></section>;
}
