import { requestRegion } from "@/lib/request-region";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Film, Users, Settings } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { MovieRail } from "@/components/movie-card";
import { movieSummary } from "@/lib/media";
export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const viewerRegion = await requestRegion();
  const { username } = await params; const viewer = await currentUser();
  const profile = await db.profile.findUnique({ where: { username: username.toLowerCase() }, include: { user: { select: { id: true, image: true, createdAt: true, suspended: true, _count: { select: { followers: true, following: true } } } } } });
  if (!profile || profile.user.suspended || (!profile.publicProfile && viewer?.id !== profile.userId)) notFound();
  if (viewer && await db.block.findFirst({ where: { OR: [{ blockerId: viewer.id, blockedId: profile.userId }, { blockerId: profile.userId, blockedId: viewer.id }] } })) notFound();
  const own = viewer?.id === profile.userId;
  const favorites = await db.movie.findMany({ where: { id: { in: profile.favoriteMovieIds } }, include: { sources: true } });
  const rooms = await db.cinemaRoom.findMany({ where: { hostId: profile.userId, endedAt: null, ...(own ? {} : { visibility: "PUBLIC" }) }, select: { id: true, title: true, visibility: true }, take: 12 });
  const clubs = await db.clubMembership.findMany({ where: { userId: profile.userId }, include: { club: { select: { id: true, name: true } } }, take: 12 });
  const history = own || profile.showActivity ? await db.watchHistory.findMany({ where: { userId: profile.userId }, include: { movie: { include: { sources: true } } }, orderBy: { updatedAt: "desc" }, take: 12 }) : [];
  return <section className="page-container"><div className="profile-cover"><div className="profile-avatar" style={profile.user.image ? { backgroundImage: `url('${profile.user.image}')` } : {}}>{!profile.user.image && username.slice(0, 2).toUpperCase()}</div><div><span className="eyebrow">CINECHAT COMMUNITY</span><h1>@{profile.username}</h1><p className="muted">{profile.biography || "A story lover with a seat in the cinema."}</p><div className="movie-meta"><span>{profile.user._count.followers} followers</span><span>{profile.user._count.following} following</span><span>Joined {profile.user.createdAt.getFullYear()}</span></div></div>{own && <Link href="/settings" className="button button-glass"><Settings size={15} />Edit profile</Link>}{!own && <Link href={`/community?user=${profile.userId}`} className="button button-glass"><Users size={15} />Connect</Link>}</div><div className="section-header"><h2>Favorite films</h2></div>{favorites.length ? <MovieRail movies={favorites.map(v => movieSummary(v, viewerRegion))} /> : <p className="muted">No favorites chosen yet.</p>}{history.length > 0 && <><div className="section-header"><h2>{own ? "Your watch history" : "Recent films"}</h2></div><MovieRail movies={history.map(v => movieSummary(v.movie, viewerRegion))} /></>}<div className="profile-columns"><div className="glass-card"><h2><Film size={18} className="inline mr-2" />Created cinemas</h2>{rooms.length ? rooms.map(r => <Link className="list-row" key={r.id} href={`/cinemas/${r.id}`}><span>{r.title}</span><span className="pill">{r.visibility.toLowerCase()}</span></Link>) : <p className="muted">No active cinemas.</p>}</div><div className="glass-card"><h2><Users size={18} className="inline mr-2" />Movie clubs</h2>{clubs.length ? clubs.map(c => <Link className="list-row" key={c.clubId} href={`/clubs/${c.clubId}`}>{c.club.name}</Link>) : <p className="muted">No clubs joined yet.</p>}</div></div></section>;
}
