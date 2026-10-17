import Link from "next/link";
export default function NotFound() { return <section className="page-container empty-state"><h1>This seat is empty.</h1><p>The page was not found, or you do not have access.</p><Link href="/" className="button button-primary">Back to the lobby</Link></section>; }
