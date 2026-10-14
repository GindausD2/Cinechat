import Link from "next/link";
import { Plus } from "lucide-react";
import { currentUser } from "@/lib/session";
import { listTheaters, type TheaterScope } from "@/lib/theaters";
import { TheaterLobby } from "@/components/theater-lobby";

export default async function Page({ searchParams }: { searchParams: Promise<{ upcoming?: string; type?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const upcoming = params.upcoming === "true";
  const scope: TheaterScope = params.type === "private" || params.type === "public" ? params.type : "all";
  const rooms = await listTheaters(scope, user?.id, upcoming);
  return <section className="page-container">
    <div className="page-heading"><div>
      <span className="eyebrow">{scope === "private" ? "RESERVED FOR YOUR PEOPLE" : "THE WORLD’S FRONT ROW"}</span>
      <h1>{upcoming ? "Something to look forward to." : scope === "private" ? "Your private theaters." : "The cinema is open."}</h1>
      <p className="muted">{scope === "private" ? "A film, your invited guests, and a conversation just for you." : "Find a public screening and share the moment with a reaction."}</p>
    </div><Link href="/cinemas/new" className="button button-primary"><Plus size={16} />Create theater</Link></div>
    <nav className="filter-tabs" aria-label="Theater discovery">
      <Link href="/cinemas" className={scope === "all" && !upcoming ? "active" : ""} aria-current={scope === "all" && !upcoming ? "page" : undefined}>All theaters</Link>
      <Link href="/cinemas?type=public" className={scope === "public" && !upcoming ? "active" : ""} aria-current={scope === "public" && !upcoming ? "page" : undefined}>Public theaters</Link>
      <Link href="/cinemas?type=private" className={scope === "private" && !upcoming ? "active" : ""} aria-current={scope === "private" && !upcoming ? "page" : undefined}>Private theaters</Link>
      <Link href="/cinemas?upcoming=true" className={upcoming ? "active" : ""} aria-current={upcoming ? "page" : undefined}>Upcoming screenings</Link>
    </nav>
    <TheaterLobby key={`${scope}-${upcoming}`} initial={rooms} scope={scope} upcoming={upcoming} signedIn={Boolean(user)} />
  </section>;
}
