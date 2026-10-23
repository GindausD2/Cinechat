# Assets and playback rights — 22 October 2026

Technical checks do not grant legal rights. Verify licenses, attribution, distribution territories, any excluded material and changes for each release. No commercial movie licenses are inferred from metadata or public availability.

## Existing catalog and artwork

`public/art/films/licenses.json` records ten shipped poster/still files with published author, source page, Creative Commons version and modifications. `/legal#artwork` renders author/source/license links and modification notices. The default artwork lookup uses these locally hosted files rather than contacting Wikimedia at runtime.

| Assets | Published license / source |
| --- | --- |
| bunny-poster.webp, bunny-still.webp | CC BY 3.0; individual Wikimedia source pages in manifest; Blender Foundation. |
| sintel-poster.webp, sintel-still.webp | CC BY 3.0; individual source pages; Blender Foundation / Durian. |
| steel-poster.webp, steel-still.webp | CC BY 3.0; individual source pages; Blender Foundation / Project Mango. |
| cosmos-poster.webp | CC BY 4.0; source page credits Andy Goralczyk and Blender Foundation. |
| elephants-poster.webp | CC BY 4.0; source page credits Bassam Kurdali, Andy Goralczyk and Blender Foundation. |
| elephants-still.webp | CC BY 2.5; source page credits Ton Roosendaal et al. |
| caminandes-still.webp | CC BY 3.0; source page credits Francesco Siddi and Pablo Vazquez. Used as a clearly cropped film image, not represented as an original studio poster. |

Images were resized/encoded as WebP; credits preserve the recorded transformations. Re-check per-file source statements before distribution. Creative Commons attribution does not necessarily grant trademark/publicity rights. No company-logo reuse is authorized by these notices.

Legacy `public/art/{bunny,sintel,steel,cosmos,elephants,caminandes}.svg` are project-created poster compositions retained for old catalog records, not copies of commercial streaming branding. `bunny.svg` embeds a Big Buck Bunny film frame and `bunny-backdrop.jpg` is a legacy frame asset. They depend on the film's attribution license, not on the fact they were online. Current default artwork maps to the separately attributed manifest assets; verify legacy frame provenance before reusing them in promotional exports.

## Video and trailers

Official publisher pages fetched and inspected during this audit:

- https://peach.blender.org/about/ — states CC Attribution 3.0 for Peach results, permits redistribution with attribution and identifies exclusions for logos, trademarks, certain material and DVD packaging.
- https://durian.blender.org/sharing/ — states CC Attribution 3.0 for Durian results, with required attribution and exclusions.
- https://mango.blender.org/sharing/ — states CC Attribution 3.0 for Mango results, permits redistribution with attribution and identifies exclusions.

These were source-document checks, not a legal opinion about every asset or launch country. Keep their exact attribution in the player and credit page.

`scripts/setup-media.sh` downloads the official Big Buck Bunny 320×180 MP4 archive. The sample is an open-film starter catalog, not a licensed library of commercial releases. The actual full film runs about 596 seconds. The optional Tears of Steel source has its own CC BY 3.0 rights reference. Metadata-only titles are not automatically playable.

`scripts/setup-hls-fixture.sh` creates a 20-second, silent, resized Big Buck Bunny excerpt for tests, with 90p/180p HLS variants. The English/Spanish VTT text is original test attribution text, not a full caption translation of the movie. Do not advertise test captions as a complete accessibility transcript. Official caption tracks need their own source/permission review.

`authorized-trailers.ts` recognizes only the documented official Sintel trailer URL, enforces approved host and age rules, and returns its recorded license/attribution. Unreviewed metadata URLs never produce a trailer player. The trailer contacts its host only after “Load official trailer.” No third-party iframe is embedded.

## Fonts and icons

- `@fontsource/inter` and `@fontsource/montserrat`: SIL Open Font License 1.1, complete copyright and license notices copied to `public/legal/licenses/inter.txt` and `montserrat.txt`. These fonts are served locally. Retain notices and respect reserved-name/license conditions for modified fonts.
- `lucide-react`: ISC, including retained Feather MIT portions. Complete package notice copied to `public/legal/licenses/lucide.txt` and linked publicly.
- CineChat wordmark/brand mark and interface graphics are repository-created. No claim to Netflix, HBO, Apple or Blender trademarks is made.

## Operator action required

Administrators must hold permission for every custom poster, avatar, promotional image, subtitle and video. An HTTPS address, image consent, metadata provider reference or administrator checkbox is not proof of copyright clearance. Unverified external artwork needs replacement with a documented local asset or a properly licensed upload; no unverified commercial art was added by this task.

MediaSource authorization/date/host/region checks and server age checks remain active on room joins, snapshots, watch pages and real-time operations. Geography relies on a trusted proxy that strips/overwrites the configured country header; default-country fallback is not reliable territory assurance. Restricted licensed launches need a reviewed trusted geo/CDN enforcement arrangement, secure origins, any signed-delivery controls and actual rights documents. Do not expose app origins in a way that permits forging the trusted country header. FrameXTV remains disabled pending evidence.
