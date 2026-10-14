"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="page-container empty-state"><h1>A brief intermission.</h1><p>We couldn’t load this page. Please try again.</p><button className="button button-primary" onClick={reset}>Try again</button></section>; }
