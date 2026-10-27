# CineChat V1 — implementation and verification

Repository: **GindausD2/Cinechat**. This release extends baseline `b202306b` in the
existing Next.js/Auth.js/PostgreSQL/Prisma/Socket.IO/Redis application. No framework,
authentication provider or database was replaced. No existing user data was reset.

Public Theater provides shared movies, live viewers and emoji reactions only.
Private Theater provides invited membership, shared movies, private chat and emoji
reactions. Both are free; billing stays disabled and isolated.

## Completed changes

- **Public administration:** current database administrators create/schedule public
  screenings and operate playback/moderation after joining. A historical HOST role
  alone grants no public playback permission. Public creation, playback, ending,
  invitation revocation and moderation have audit records. Administrators can also
  end rooms from the existing administrator dashboard without joining.
- **Screening discovery:** portrait posters, titles, genre/runtime, viewer counts,
  local-time screening labels, and Upcoming/Live/Ended/Unavailable states. Ended
  and unavailable cards have no theater-entry action. Public/private sections,
  past screenings, movie-specific parties and homepage counts share discovery
  logic with region/age checks. Private metadata requires a current invitation
  grant or ownership.
- **Public capacity:** 45-second seat reservations expire alongside presence;
  reconnects recheck capacity. Public joins and heartbeat renewals lock the same
  room row, preventing expired reservations from overbooking a screening. Existing
  memberships are retained. Private invited membership keeps its existing policy.
- **Emoji-only public viewing:** all existing seven supported reactions remain,
  including ❤️ 😂 😮 😢 🔥 👏 and the earlier 👍. Floating reactions expire,
  respect reduced motion and can be hidden. Public text creation, deletion,
  message-targeted reactions and message history remain prohibited. Redis fanout
  also excludes public message/deletion events.
- **Private messaging:** members delete their own messages; hosts moderate messages.
  Deletions are soft, audited, idempotent and delivered to authorized viewers.
  Optional UUID retry keys prevent duplicate database messages across transports
  and workers. Repeated notifications use the same ID; clients deduplicate and
  suppress deleted messages. Retrying a committed message/deletion republishes
  its notification after an interrupted initial publication.
- **Invitations:** the existing secure, hashed-token invitation/code/expiry/use-limit
  flows remain connected. Invite Friends, actual clipboard copying, Start Watching,
  link sharing and revocation work. Registration/verification/login retain the
  invitation destination. Private WebSocket joins retain the existing membership
  checks and non-disclosure responses.
- **Bounded realtime work:** four concurrent room deliveries, 32 pending events per
  room, 128 queued rooms per worker, eight operations per socket, and transport
  backpressure limits. Overload refreshes authoritative state or reconnects;
  ephemeral reactions may be dropped. Redis subscriber recovery refreshes room
  state/history from PostgreSQL. Heartbeats process four rooms at a time.
- **Discovery pagination:** stable timestamp/ID cursors, bounded page sizes, Load
  more, cancellation, loading/empty/error states and keyboard navigation. The
  server-rendered initial page is preserved when more results arrive.
- **Subtitles and player:** language-labelled, approved-host WebVTT tracks retain
  compatibility with existing English caption URLs. Administrators configure
  tracks through the media-rights form. Quality choices come from actual HLS
  variants. Hide/show controls, local volume, fullscreen/fallback, buffering,
  reload recovery and Tap to Start Watching follow the shared timeline. Aborted
  loads are distinguished from genuine autoplay denial. The emoji tray adapts
  to control height instead of covering playback controls.
- **Design:** the existing black/blue and white/blue identity, restrained glass,
  Inter/Montserrat typography and theme persistence are preserved. Movie-specific
  screening times now use the viewer’s timezone. Light-theme timezone contrast
  and mobile control spacing were checked in the browser.

## Existing features preserved

Authentication/session validation, registration, email verification/reset,
logout/session revocation, account/profile editing/deletion, privacy, watchlists,
history, favorites, friendships/following, clubs, notifications/reminders,
reporting, copyright complaints, and existing administrator tools remain in
place. Their original Auth.js and account/social APIs are reused.

The existing playback projection/drift helpers, signed realtime tickets,
invitation-grant validation, server premiere lifecycle, media rights/region/age
checks, approved media delivery, object-storage integration boundary, Docker
configuration, health endpoints, `.env.example` and local setup scripts remain.
The current schema retains legacy billing records without enabling payment flows.

## Database migrations

Apply **all** migrations before starting the new web/realtime processes:

```sh
npm run db:generate
npm run db:migrate
```

Three additive migrations extend the three previously applied migrations:

| Migration | Change |
| --- | --- |
| `20261018000100_private_message_delivery` | Nullable UUID message retry key and unique `(roomId, userId, clientNonce)` index; legacy messages remain valid. |
| `20261018000200_catalog_subtitles` | SubtitleTrack with source foreign key/cascade, unique language per source, language/label constraints; composite movie pagination index. Legacy `subtitleUrl` remains. |
| `20261018000300_public_seat_leases` | Room/status/last-seen index for public capacity reservations. No memberships are removed or reset. |

All six migrations were applied locally. Prisma’s live-database/schema comparison
reported **No difference detected**. Integration checks cover nonce uniqueness,
subtitle foreign-key-backed persistence, invalid language/duplicate rejection,
track preservation and capacity/renewal transaction races.

## Verification evidence

Baseline before feature work: `npm run check` passed lint, TypeScript, **22 unit
tests in 10 files**, and the production build. The original production browser
suite passed **16/16**. Existing local database/cache containers needed restarting
following environment startup; their volumes were preserved.

| Command/check | Latest release result |
| --- | --- |
| `npm run check` | Pass: lint, TypeScript, 32 unit tests in 13 files, optimized production build. |
| `E2E_PRODUCTION=true npm run test:e2e` | Pass: 22 tests, 4.2 minutes; 28 theme/layout states passed automated WCAG A/AA scans. |
| `E2E_PRODUCTION=true npm run test:mobile` | Pass: 2 engine cases, two independent contexts each; Chromium/Android and WebKit/iPhone emulation, 1.2 minutes. |
| `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` | Pass: no schema difference. |
| `npm audit --omit=dev` | Pass: zero reported production dependency vulnerabilities. |
| `git diff --check` | Pass. |
| `npm run check:production` | Hosted configuration is blocked: missing SMTP, development HTTP origins and enabled local media/outbox flags. |

Browser tests use real PostgreSQL and Redis, two realtime workers, licensed MP4
and two-rendition HLS media, plus an actual loopback-only SMTP receiver for
synthetic verification/reset emails. They never send mail to external recipients.
Only the local synthetic-test signup quota was reset between repeated runs;
application rate limiting and stored users were preserved.

Coverage includes signup/login/reset/deletion, search/filter/pagination/errors,
public join/late join/reactions/no-chat, private creation/invitations/codes/rejoin/
revocation/expiry/chat/deletion, host/admin permissions, membership removal,
concurrent capacity races, active-seat expiry, buffering/reload/autoplay recovery,
subtitles/quality, reminders/social features and free billing boundaries.

A dedicated two-browser test introduces asymmetric **90 ms outbound / 350 ms
inbound** delay, a **90-second device-clock skew**, and an old playback revision
released **2.2 seconds late**. It verifies stale-state/command rejection, playback
agreement within the 1.5-second acceptance threshold, offline/reconnect presence,
and private history recovery. A separate worldwide-premiere test uses New York
and Tokyo timezones, US/GB region checks, a two-minute clock skew, refresh,
disconnection and server-owned premiere start/end.

The concurrency test uses **100 authenticated synthetic socket viewers plus a
browser host**, two workers, duplicate connections and concurrent rooms. This is
local workload evidence, not certification of 1,000 viewers or a worldwide SLA.

The mobile command runs Chromium with Android/Pixel emulation and **WebKit** with
iPhone emulation, each with two independent contexts. It covers both theater
types, actual media/chat/reactions, host controls, leave/rejoin, fullscreen,
portrait/landscape, both themes and control-overlap checks. These are browser
engine/emulation results, not physical Android Chrome or iOS Safari certification.
Install engines with `npx playwright install --with-deps chromium webkit`.
`E2E_WEBKIT_EXECUTABLE` optionally selects an installed WebKit wrapper in restricted
environments; this workspace used private, ignored browser libraries under `.data`.
The WebKit build also requires a writable `/var/tmp` for media buffering. Its
initial extended fullscreen run failed because the sandbox denied that temp path;
a scoped filesystem grant fixed the test environment. Both engine cases then
passed with unchanged application code.

Intermediate checks found and fixed an initial-search overwrite, insufficient
light-theme timezone contrast, and a private WebSocket denial-response regression
while adding public seat checks. Test cleanup, asynchronous modal reads and
selectors were corrected. The old design test’s fixed catalog-size assumption
was replaced with checks against actual genre-filtered metadata.

## Security outcomes

Public message creation/deletion/history are rejected or omitted at every public
boundary. Non-admin public controls and non-host private controls are denied.
Unauthorized, expired, revoked, blocked and removed private members cannot read
room messages or receive protected events. Public seat expiry is enforced on
snapshot, reservation, fanout and reconnection paths. Reaction limits are shared
across HTTP/WebSockets; switching transports does not bypass the limit.

Messages remain escaped React text, body lengths are validated, and identifiers,
URLs, subtitle languages and event payloads are bounded. Rights/source hosts,
license windows, age and ticket-bound region are rechecked. Subtitle metadata
exposes labels/languages without stream or caption URLs. Invitation tokens remain
cryptographic bearer secrets stored only as hashes. Current server-side session,
CSRF/origin, hashing and ticket checks are retained. No secrets were added to the
client or committed environment files. Payment routes remain hard disabled.

## Run and test

Requirements: Node 24, PostgreSQL 17, Redis 7, Docker Compose for the local services,
FFmpeg for HLS fixtures, and supported Playwright browser dependencies.

```sh
npm ci
npm run setup:local
npm run infra:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run media:setup
npm run dev
```

Open `http://localhost:3000`. Development verification links are private files in
`.data/outbox/`. Set `ADMIN_EMAILS` before registering the administrator. Ordinary
users create private theaters; administrators create public screenings. Open an
invitation in a separate signed-in browser to test private watching/chat.

For compiled acceptance tests, stop manually running web/realtime/media services,
keep PostgreSQL/Redis available, then run:

```sh
npx playwright install --with-deps chromium webkit
npm run media:hls-fixture
npm run check
E2E_PRODUCTION=true npm run test:e2e
E2E_PRODUCTION=true npm run test:mobile
```

Use an isolated local/test database. Browser tests create real synthetic users
and records; do not point them at production. Playwright manages web, mail,
media and two realtime processes. Screenshots/reports go to `test-results/` and
`playwright-report/`; CI retains artifacts for seven days.

## Configuration, licensing and release readiness

Required hosted configuration: `DATABASE_URL`, `REDIS_URL`, independent
`AUTH_SECRET`/`REALTIME_SECRET`, HTTPS `APP_ORIGIN`/`AUTH_URL`, build/runtime
`NEXT_PUBLIC_WS_URL`, `SMTP_URL`/`EMAIL_FROM`, approved `MEDIA_ALLOWED_HOSTS`, and
`REGION_DEFAULT`. Set `ADMIN_EMAILS` for bootstrap administration. Google OAuth
(`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) is optional and requires real-provider
verification. No payment credentials are required.

For media CDN/object storage, configure `OBJECT_STORAGE_BUCKET`,
`OBJECT_STORAGE_REGION`, access/secret keys, optional endpoint and
`MEDIA_CDN_BASE_URL`. Use a rights-approved delivery host with CORS, byte ranges
and suitable HLS packaging. Commercial content needs explicit distribution,
regional, subtitle and any DRM/entitlement agreements. The existing license
boundary does not confer those rights. FrameXTV stays disabled pending a verified
API contract and permissions. The working local catalog uses Creative Commons
open-film samples; metadata-only entries remain clearly unavailable to stream.

The application is ready for configured preview testing. The local production
configuration checker intentionally fails for missing SMTP and development
HTTP/outbox/local-media settings; it must pass with real hosted configuration. No public
application deployment or merge is performed. Hosted launch still requires
operator infrastructure/secrets, real SMTP/OAuth as applicable, approved CDN and
media licensing, physical-device testing, and multi-region/load validation. Managed database/Redis failover and commercial
CDN entitlement behavior remain operator verification tasks.
PostgreSQL/Redis should be close to application services; direct media CDN delivery
supports geographically distributed viewers. Set a trusted country header only
behind a proxy that overwrites it and blocks direct origin access. Synchronize
server clocks. Configure backups, monitoring and pool budgets before launch.

See [DEPLOYMENT.md](DEPLOYMENT.md) for service commands, TLS, Redis coordination,
queue limits, database release ordering, object storage and health checks.

## Changed files

The exact paths and descriptions are recorded in [V1-FILES.md](V1-FILES.md).

## Visual review

Twelve representative final PNGs were opened and visually inspected: public and
private desktop/mobile in both themes, discovery in both desktop themes, and two
mobile fullscreen frames. Files below are copied directly from browser captures.
No generated mockups or edited composites are used. One Chromium viewport image
omitted its sticky navigation during capture; the inspected full-page frame was
retained for that state. WebKit media buffering needed the sandbox temp permission
noted above.

| Surface | Dark | Light |
| --- | --- | --- |
| Private desktop | [Capture](v1-release/private-desktop-dark.png) | [Capture](v1-release/private-desktop-light.png) |
| Public desktop | [Capture](v1-release/public-desktop-dark.png) | [Capture](v1-release/public-desktop-light.png) |
| Discovery desktop | [Capture](v1-release/discovery-desktop-dark.png) | [Capture](v1-release/discovery-desktop-light.png) |
| Private mobile, WebKit emulation | [Capture](v1-release/private-mobile-dark.png) | [Capture](v1-release/private-mobile-light.png) |
| Public mobile, WebKit emulation | [Capture](v1-release/public-mobile-dark.png) | [Capture](v1-release/public-mobile-light.png) |

[Private fullscreen](v1-release/private-mobile-fullscreen.png) ·
[Public fullscreen](v1-release/public-mobile-fullscreen.png) ·
[Recorded local concurrency measurement](v1-release/concurrency.json).

The screenshots show licensed Big Buck Bunny artwork/video, © Blender Foundation,
CC BY 3.0, with attribution in the application. Full image credits are retained in
`public/art/films/licenses.json`.

## Smallest steps before hosted launch

1. Provision managed Postgres/Redis, HTTPS web/realtime origins, real SMTP and
   approved CDN/storage; inject secrets and run the production configuration check.
2. Apply all six migrations, bootstrap the intended administrator and confirm
   every enabled film/subtitle asset’s rights, region, dates and attribution.
3. Smoke-test external email/OAuth as applicable, real CDN playback, physical
   Android/iOS devices, regional routing/failover and the intended audience load.
4. Review the draft pull request and authorize any merge or public deployment
   separately. No payment setup is part of this release.
