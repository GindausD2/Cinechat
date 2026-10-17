import Link from "next/link";
export default function Page() {
  return <section className="page-container empty-state"><h1>Movies bring us together.</h1><p>CineChat is free to use. Public screenings, private theaters, chat, and reactions are available without payment.</p><Link href="/cinemas" className="button button-primary">Explore theaters</Link></section>;
}
