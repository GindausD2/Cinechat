"use client";
import { useState } from "react";
import { GlassButton } from "./glass";
export function AuthorizedTrailer({ trailer, title }: { trailer: { url: string; attribution: string; rightsUrl: string; license: string }; title: string }) {
 const [loaded, setLoaded] = useState(false);
 return <section className="trailer-section"><h2>Official trailer</h2>{loaded ?
 // eslint-disable-next-line jsx-a11y/media-has-caption -- This official trailer does not supply licensed caption tracks.
 <video controls autoPlay crossOrigin="anonymous" preload="none" src={trailer.url} className="trailer-video" aria-label={`${title} authorized trailer`} />
 : <div className="glass-card"><p>Loading this trailer contacts its authorized media host. Captions are not supplied for this trailer.</p><GlassButton onClick={() => setLoaded(true)}>Load official trailer</GlassButton></div>}<small className="muted">{trailer.attribution} <a href={trailer.rightsUrl} target="_blank" rel="noreferrer">{trailer.license}</a></small></section>;
}
