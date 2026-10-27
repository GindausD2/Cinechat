import Link from "next/link";
import { Users, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { CreateClubForm } from "@/components/create-club-form";
export default async function Page() {
  const user = await currentUser(); const clubs = await db.movieClub.findMany({ include: { _count: { select: { memberships: true } } }, orderBy: { memberships: { _count: "desc" } }, take: 60 });
  return <section className="page-container"><div className="page-heading"><div><span className="eyebrow">FIND YOUR PEOPLE</span><h1>A shared taste. A new connection.</h1><p className="muted">Little communities built around a big love of cinema.</p></div>{user ? <CreateClubForm /> : <Link href="/login" className="button button-primary">Sign in to create a club</Link>}</div><div className="club-grid">{clubs.map(club => <Link key={club.id} href={`/clubs/${club.id}`} className="club-card glass-card" style={{ "--club-color": club.color } as React.CSSProperties}><div className="club-emblem"><Users size={26} /></div><span className="eyebrow">{club.genre.toUpperCase()}</span><h2>{club.name}</h2><p className="muted">{club.description}</p><div className="club-card-footer"><span>{club._count.memberships} members</span><ArrowUpRight size={16} /></div></Link>)}</div>{!clubs.length && <div className="empty-state"><Users size={30} className="mx-auto mb-4" /><h2>Your people are out there.</h2><p>Create the first movie club and give them a place to gather.</p></div>}</section>;
}
