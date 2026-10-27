import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Radio, Lock, Plus, UserRound, ArrowRight } from "lucide-react";
import { currentUser } from "@/lib/session";
import { requestRegion } from "@/lib/request-region";
import { watchOptions } from "@/lib/watch-options";
import { AppError } from "@/lib/security";
import { hasPolicyAcceptance } from "@/lib/policy-acceptance";
import { TheaterLobby } from "@/components/theater-lobby";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ room?: string }> }) {
  const [{ id }, query, user, region] = await Promise.all([params, searchParams, currentUser(), requestRegion()]);
  const context = query.room && /^[a-zA-Z0-9_-]{1,120}$/.test(query.room) ? query.room : undefined;
  if (query.room && !context) notFound();
  const target = `/movies/${encodeURIComponent(id)}/watch${context ? `?room=${encodeURIComponent(context)}` : ""}`;
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(target)}`);
  if (!await hasPolicyAcceptance(user.id)) redirect(`/onboarding?returnTo=${encodeURIComponent(target)}`);
  let data;
  try { data = await watchOptions(id, user, region); }
  catch (error) {
    if (!(error instanceof AppError)) throw error;
    if (error.status === 404) notFound();
    return <section className="page-container empty-state"><h1>This film is unavailable to watch.</h1><p>{error.message}</p><Link className="button button-primary" href={`/movies/${id}`}>Back to film details</Link></section>;
  }
  if (context) {
    if (![...data.publicTheaters, ...data.privateTheaters].some(room => room.id === context)) notFound();
    redirect(`/cinemas/${context}`);
  }
  return <article className="page-container watch-selection">
    <Link href={`/movies/${id}`} className="back-link"><ArrowLeft size={16} />{data.movie.title} · Film details</Link>
    <div className="page-heading"><div><span className="eyebrow">CHOOSE YOUR AUDIENCE</span><h1>How would you like to watch?</h1><p className="muted">{data.movie.title} · Public screenings or a private theater with friends. Free in CineChat V1.</p></div></div>
    <nav className="watch-choices" aria-label="Theater choices">
      <a href="#public-screenings"><Radio size={24} /><h2>Public Theater</h2><p>Watch with the world. Movies, live viewers and emoji reactions.</p><span>{data.publicTheaters.length ? "See available screenings" : "Check screening availability"}<ArrowRight size={16} /></span></a>
      <a href="#private-theaters"><Lock size={24} /><h2>Private Theater</h2><p>Watch with invited friends. Private chat and emoji reactions.</p><span>Choose your private screening<ArrowRight size={16} /></span></a>
    </nav>
    <section id="public-screenings" aria-labelledby="public-options-title"><div className="section-header"><h2 id="public-options-title">Public screenings</h2></div>{data.publicTheaters.length ? <TheaterLobby initial={data.publicTheaters} scope="public" upcoming={false} movieId={id} signedIn authorizedChoices /> : <p className="watch-empty">No public screenings are live or scheduled for this film. You can create a private theater below.</p>}</section>
    <section id="private-theaters" aria-labelledby="private-options-title"><div className="section-header"><h2 id="private-options-title">Private theaters</h2><Link href={`/cinemas/new?type=private&movie=${encodeURIComponent(id)}`} className="button button-primary"><Plus size={16} />Create private theater</Link></div><p className="muted">Only rooms you host or have valid invitation access to appear here. Creating a room is a separate, deliberate action.</p>{data.privateTheaters.length ? <TheaterLobby initial={data.privateTheaters} scope="private" upcoming={false} movieId={id} signedIn authorizedChoices /> : <p className="watch-empty">You have no authorized private theater for this film yet. Create one, or open an invitation from a friend.</p>}</section>
    <div className="solo-option"><UserRound size={18} /><p>Prefer a personal screening?</p><Link href={`/watch/${id}`} className="subtle-link">Watch on your own <ArrowRight size={14} /></Link></div>
  </article>;
}
