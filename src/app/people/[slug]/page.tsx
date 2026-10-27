import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { personProfile } from "@/lib/people";
import { requestRegion } from "@/lib/request-region";
import { db } from "@/lib/db";
import { movieSummary } from "@/lib/media";
import { PersonPortrait } from "@/components/people-rail";
import { MovieCard, MovieRail } from "@/components/movie-card";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, region] = await Promise.all([params, requestRegion()]);
  const person = await personProfile(slug, region); if (!person) notFound();
  const genres = [...new Set(person.filmography.flatMap(film => film.movie.genres))];
  const related = genres.length ? await db.movie.findMany({ where: { id: { notIn: person.filmography.map(film => film.movie.id) }, genres: { hasSome: genres } }, include: { sources: { include: { subtitles: true } } }, orderBy: [{ year: "desc" }, { id: "asc" }], take: 8 }) : [];
  return <article className="page-container person-editorial">
    <Link href="/movies" className="back-link"><ArrowLeft size={16} />Explore movies</Link>
    <header className="person-introduction">
      <figure><PersonPortrait person={person} large />{person.portraitAttribution && person.portraitLicenseUrl && <figcaption>{person.portraitAttribution} · <a href={person.portraitLicenseUrl} target="_blank" rel="noreferrer">License</a>{person.portraitSourceUrl && <> · <a href={person.portraitSourceUrl} target="_blank" rel="noreferrer">Photograph source</a></>}</figcaption>}</figure>
      <div><span className="eyebrow">THE PEOPLE BEHIND THE PICTURE</span><h1>{person.name}</h1><p className="person-profession">{person.professions.join(" · ")}</p><p>{person.biography}</p><a className="subtle-link" href={person.sourceUrl} target="_blank" rel="noreferrer">Biography source <ExternalLink size={14} /></a></div>
    </header>
    <section aria-labelledby="filmography-title"><div className="section-header"><h2 id="filmography-title">Films in CineChat</h2><span className="muted">Verified catalog credits</span></div>
      {person.filmography.length ? <div className="filmography-grid">{person.filmography.map(film => <div className="filmography-entry" key={film.movie.id}><MovieCard movie={film.movie} /><p className="credit-role">{film.roles.join(" / ")}</p><details><summary>Credit sources</summary>{film.sources.map(source => <a key={source} href={source} className="subtle-link" target="_blank" rel="noreferrer">Official film credits <ExternalLink size={12} /></a>)}</details></div>)}</div> : <p className="muted">No verified film credits are available in this catalog yet.</p>}
    </section>
    {related.length > 0 && <section aria-labelledby="people-related-title"><div className="section-header"><h2 id="people-related-title">Continue exploring</h2></div><MovieRail movies={related.map(movie => movieSummary(movie, region))} /></section>}
  </article>;
}
