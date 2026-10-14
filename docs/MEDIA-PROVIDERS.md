# Metadata, playback, and rights

## FrameXTV investigation (2026-10-14 UTC)

Requests to `https://framextv.xyz/api`, `/api/movies`, and `/terms` returned
HTTP 200, `text/html`, and the same single-page application shell titled
frameXTV. This did not establish a JSON movie endpoint, authentication contract,
metadata license, trailer authorization, regional availability, or distribution
permission. A 200 HTML fallback is not evidence of a working API. No private API,
stream extraction, DRM workaround or unverified playback embed was used.

`FrameXMetadataProvider` is deliberately disabled. Enabling it requires a
published API contract, a testable authentication method, metadata permissions,
reliability checks and a legal assessment. Metadata access never grants streaming
rights; a separate MediaSource record is required for every playable title.

## Curated launch catalog

- Big Buck Bunny: film and data are CC BY 3.0 per
  https://peach.blender.org/about/. Official archive:
  https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4.zip.
  Archive retrieved and film extracted locally; 596.46 seconds, 320×180.
  CineChat's movie backdrop is an unmodified frame extracted from this film.
  Attribution: © 2008 Blender Foundation / www.bigbuckbunny.org.
- Tears of Steel: film/data are CC BY 3.0 per
  https://mango.blender.org/sharing/. Official 720p MOV delivery URL returned
  HTTP 200 with byte-range support. Attribution: © 2012 Blender Foundation /
  mango.blender.org. The separate `copyright.txt` in the download directory
  applies to the soundtrack files (CC BY-ND), and is not the film license.
- Sintel: metadata and an official MP4 trailer from Blender's download host.
  https://durian.blender.org/about/ states CC BY 3.0. Trailer delivery returned
  HTTP 200. No full-film source is enabled.
- Cosmos Laundromat, Elephants Dream, Caminandes: linked official project
  metadata and original CineChat poster compositions. No source is enabled;
  their detail pages clearly explain that full-film delivery is not configured.

Logos and trademarks excluded from the film projects' Creative Commons terms
are not used as CineChat branding. Original poster compositions are not official
film posters. Licenses and attribution appear beside the player and in legal info.

## Rights enforcement

Public discovery serializes movie metadata and availability, without source URLs.
Solo player, room join, room snapshot, and every live playback/chat/reaction request
check authorization, enabled state, allowed delivery hosts, license validity,
deployment region and user age. Trusted `REGION_DEFAULT` belongs to the deployment;
client-supplied country headers are ignored. For a global release, add a trusted
regional deployment gateway and region-aware routing rather than accepting an
arbitrary forwarded header.

Local playback is a separate byte-range media server on port 3002, with explicit
`ALLOW_LOCAL_MEDIA=true`. It is for development only. The web and realtime servers
do not relay video. For launch, upload approved files to object storage and deliver
through an HTTPS CDN, update MediaSource records, remove localhost from the host
allowlist, disable local media mode, and configure the CDN for range requests and
CORS. Rights administrators must review licenses and region restrictions before
enabling additional media. Commercial films require actual distribution licenses.
