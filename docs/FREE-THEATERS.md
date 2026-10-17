# Free public and private theaters — October 2026

Repository: **GindausD2/Cinechat**. This extends the existing Next.js/Auth.js,
PostgreSQL/Prisma, Socket.IO/Redis, themes and licensed-media implementation.
No public deployment or payment integration was performed.

## Behavior

**Public Theater:** discover live/upcoming screenings, join worldwide viewers on
one server-owned timeline, see live unique-viewer counts, react with
❤️ 😂 😮 😢 👏 🔥 👍, and watch fullscreen. No text composer, chat panel, message
notifications, message history or public message delivery exists. Public text and
message-targeted reactions are rejected by HTTP/services/WebSocket handlers, and
the Redis delivery boundary drops public text events. Historical records remain
available for authorized moderation rather than being deleted.

**Private Theater:** choose a licensed film, title, seats, and optional access code;
creation opens a generated invitation. Share/copy the bearer link yourself, choose
1–168 hours and a guest redemption limit, and revoke individual invitations.
Only an active host or member with a valid, room-matching invitation grant can
read private messages, receive events or control their authorized session. Hosts
play/pause/seek, manage members, mute, remove, report and end screenings. Both
chat and synchronized emoji reactions remain available in private rooms.

Guests can leave and rejoin without consuming another redemption while their
grant remains valid, including when the link is fully redeemed. Revocation,
expiry, a ban, blocking, suspension or session invalidation removes access. A
valid link plus optional code is required for a new grant. Login and verification
preserve a safe same-origin invitation destination. Generated tokens are hashed
in the database; plain links are returned only at creation, not stored locally.

Public/private discovery is separate. Previously joined private rooms appear only
with a valid grant; a revoked guest cannot keep polling private viewer activity.
Upcoming screenings use UTC in storage and show the viewer’s local timezone in
the UI. Public premieres start automatically with a version-guarded database
update shared across workers. Completed public films close automatically on the
server, including when the host is absent; private playback remains host-controlled.

Every account has the same free operational limits: 1,000 public seats, 50 private
seats and 20 active theaters per creator. Room themes and all theater features are
free. Registration retains the existing global abuse ceiling of 100 attempts per
hour; review launch capacity and edge abuse controls for a larger onboarding event.
Billing POST routes return 503 even with old keys/flags; no new subscription
records are created, and legacy plan values grant no privileges. Historical
billing code/tables are retained and isolated for compatibility.

## Synchronization and scale

PostgreSQL owns playback position, playing state, timestamp and optimistic version.
Clients measure clock offset on join, project that timeline, reject stale
versions, correct drift and fetch fresh state when joining/reconnecting. Socket.IO uses signed, database-backed
tickets and checks membership/media rights before mutations. Event fanout batches
fresh authorization per room/worker, including invitation validity and blocks;
private events are not delivered during dependency failures.

Redis coordinates cross-worker fanout, shared reaction limits and atomic presence.
Each socket has a timestamped lease; a user with multiple tabs still counts once.
Heartbeats refresh in a pipeline and update memberships once per room, rather
than issuing a query waterfall for each viewer. Authorization/playback heartbeats
run every 10 seconds. Abrupt loss uses WebSocket ping deadlines and 45-second
presence leases; counts are eventually corrected rather than assumed immediate.

Video is downloaded directly from the authorized media host/CDN, never streamed
from the host browser or application server. HLS.js exposes actual manifest
renditions, with native fallback where needed. Subtitles appear only for real
tracks. Buffering, bounded HLS recovery, explicit reload to the authoritative
position, a user-gesture recovery action for blocked autoplay, and a mobile
fullscreen fallback are implemented. A quality menu cannot
create resolutions absent from the source. Local samples remain 320×180.

## Database and rollout

Additive migration: `20261017000100_free_global_theaters`:

- `RoomMembership.invitationId`, indexed FK to invitations.
- `RealtimeTicket.region`, validated two-letter country value.
- Public capacity up to 1,000; private up to 50, enforced in SQL and validation.
- Partial index for active scheduled public screenings.

Existing users, movies, messages, rooms and billing records are preserved. Old
private guest memberships have no provable invitation association and require a
fresh host invitation after this migration. Deploy web and realtime workers
together so no worker continues using older access checks. Back up first.

## Verification

Tests use local synthetic accounts, real PostgreSQL/Redis, compiled Next.js,
two Socket.IO workers, a loopback-only SMTP receiver and licensed sample media.
They do not send live external email, payments, social messages or commercial films.

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`: pass;
  22 unit tests across 10 files.
- Full production browser suite: **16 passed**. Focused design/worldwide rerun:
  **5 passed**, including a device clock two minutes fast and immediate rejoin.
- Automated WCAG A/AA scans: no reported violations across **28** desktop/mobile
  page/theme states. Layout checks include 320, 360, 390, 768, 1024 and 1440px.
  These scans are not a complete accessibility certification.
- `npm run db:migrate`: three migrations present, no pending migrations. The new
  additive migration was applied to the existing local database.
- `npm audit --omit=dev`: **0 vulnerabilities**.

Browser scenarios include registration/verification/login and safe invitation
return paths; movie search/watchlist; public HTTP/WebSocket/Redis text rejection;
seven-emoji fanout and expiry; mixed-transport reaction limits; host play/pause/seek;
private chat, invite codes/expiry/revocation/use limits, bans and nonmember denial;
leave/rejoin, abrupt disconnect/reconnect, clock skew and drift; automatic premiere
start/end without a host; timezone labels; concurrent rooms and worker isolation;
trusted regional media checks; buffering, failed MP4 reload, blocked autoplay,
mobile fullscreen fallback, real HLS rendition changes and loaded subtitle cues.
Existing friendship/club/privacy/reminder/admin/session-reset/deletion flows pass.

The local concurrency test authenticated 100 synthetic viewers across two workers,
plus a browser host, and verified a unique watching count of 101, duplicate tabs,
reconnect, emoji delivery to all 100 sockets, private/public isolation and two
concurrent rooms. Its last full-suite measurements were **1,251ms** for socket
joins and **31ms** for emoji fanout to all 100 viewers. Evidence:
[concurrency.json](free-theaters/concurrency.json). These co-located synthetic
measurements are not a global latency SLA, a 1,000-viewer capacity certification,
or a full video-CDN load test.

Captured and visually inspected screenshots are linked below. Theme/room tests
reload persisted themes and scroll content before capture to avoid Chromium
retaining stale off-screen composited layers after a theme change. Review fixed
an off-center dialog, mobile dialog scrolling and insufficient light-theme text
contrast. Physical-device and other-browser verification remains launch work.

## Run and test

Requirements: Node.js 24, PostgreSQL 17, Redis 7, Python 3/curl for the official
sample archive, FFmpeg for the HLS fixture, and Playwright Chromium.

```sh
npm ci
npm run setup:local
npm run infra:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run media:setup
npm run media:hls-fixture
npx playwright install chromium
npm run dev
```

Open `http://localhost:3000`. Development verification/reset messages are private
files in `.data/outbox/`. `npm run setup:local` preserves an existing `.env`.

```sh
npm run check
E2E_PRODUCTION=true npm run test:e2e
npm audit --omit=dev
```

Stop dev servers before production Playwright; it starts web 3000, WebSocket
workers 3001/3003, media 3002 and loopback test SMTP 2525/2526. Use a disposable
local/test database, never a production database. The HLS fixture is an attributed
20-second Big Buck Bunny excerpt in ignored `.data/media/hls/`.

## Required configuration and launch dependencies

See [.env.example](../.env.example) and [deployment instructions](DEPLOYMENT.md).
Core: `DATABASE_URL`, `REDIS_URL`, separate `AUTH_SECRET`/`REALTIME_SECRET`,
`APP_ORIGIN`, `AUTH_URL`, `NEXT_PUBLIC_WS_URL`, `WS_PORT`, `MEDIA_ALLOWED_HOSTS`.
Optional pool sizing: `DATABASE_POOL_SIZE` (default 10 per process).
Local samples use `ALLOW_LOCAL_MEDIA=true`; disable it for hosted delivery.

Regional fallback: `REGION_DEFAULT`. Optional `TRUSTED_COUNTRY_HEADER` requires
an edge that overwrites the country header and blocks direct origin access. Its
validated country is bound to the socket ticket; a browser-supplied Socket.IO
country cannot override it. No GeoIP vendor is included.

Hosted use requires your SMTP sender (`SMTP_URL`, `EMAIL_FROM`), managed database,
Redis and authorized storage/CDN. Google OAuth needs `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET`. Object upload needs the `OBJECT_STORAGE_*` variables and
`MEDIA_CDN_BASE_URL`; optional protected delivery uses `MEDIA_SIGNING_KEY`.
No Stripe/payment credentials are required or active.

Open samples are attributed Creative Commons films. Commercial movies need
explicit distribution rights, regional/license dates and approved delivery.
FrameXTV stays disabled pending an API/rights agreement. Real-provider smoke
tests, physical iOS/Android/Safari checks, multi-region latency and production
load/CDN testing remain launch work; local Chromium emulation cannot verify them.
The operator must configure legal identity/contact and publish launch policies.

## Inspected screenshots

Fourteen representative browser captures were opened and visually reviewed.
Room and invitation captures cover both themes and desktop/mobile widths.
Full-page and viewport captures are retained where Chromium painted the frame
completely; raw artifacts may omit off-screen composited layers in this headless
runtime.
| Surface | Desktop dark | Desktop light | Mobile dark | Mobile light |
| --- | --- | --- | --- | --- |
| Public Theater | [Open](free-theaters/screenshots/public-desktop-dark.png) | [Open](free-theaters/screenshots/public-desktop-light.png) | [Open](free-theaters/screenshots/public-mobile-dark.png) | [Open](free-theaters/screenshots/public-mobile-light.png) |
| Private Theater | [Open](free-theaters/screenshots/private-desktop-dark.png) | [Open](free-theaters/screenshots/private-desktop-light.png) | [Open](free-theaters/screenshots/private-mobile-dark.png) | [Open](free-theaters/screenshots/private-mobile-light.png) |
| Invitations | [Open](free-theaters/screenshots/invitation-desktop-dark.png) | [Open](free-theaters/screenshots/invitation-desktop-light.png) | [Open](free-theaters/screenshots/invitation-mobile-dark.png) | [Open](free-theaters/screenshots/invitation-mobile-light.png) |
| Discovery | [Open](free-theaters/screenshots/discovery-desktop-dark.png) | See automated capture artifacts | [Open](free-theaters/screenshots/discovery-mobile-dark.png) | See automated capture artifacts |

## Changed files

Inventory relative to baseline `545bb72` for this theater-completion update.
The archived billing files preserve the previous implementation; active routes
and all entitlements are hard disabled. Existing catalog/auth/social components
remain in place. Screenshots and concurrency evidence are included below.

100 files added or modified.

```text
.env.example
.github/workflows/ci.yml
README.md
docs/DELIVERY.md
docs/DEPLOYMENT.md
docs/FREE-THEATERS.md
docs/IMPLEMENTATION.md
docs/REDESIGN.md
docs/THEATER-AUDIT.md
docs/THEATERS.md
docs/free-theaters/concurrency.json
docs/free-theaters/screenshots/discovery-desktop-dark.png
docs/free-theaters/screenshots/discovery-mobile-dark.png
docs/free-theaters/screenshots/invitation-desktop-dark.png
docs/free-theaters/screenshots/invitation-desktop-light.png
docs/free-theaters/screenshots/invitation-mobile-dark.png
docs/free-theaters/screenshots/invitation-mobile-light.png
docs/free-theaters/screenshots/private-desktop-dark.png
docs/free-theaters/screenshots/private-desktop-light.png
docs/free-theaters/screenshots/private-mobile-dark.png
docs/free-theaters/screenshots/private-mobile-light.png
docs/free-theaters/screenshots/public-desktop-dark.png
docs/free-theaters/screenshots/public-desktop-light.png
docs/free-theaters/screenshots/public-mobile-dark.png
docs/free-theaters/screenshots/public-mobile-light.png
package.json
playwright.config.ts
prisma/migrations/20261017000100_free_global_theaters/migration.sql
prisma/schema.prisma
realtime/server.ts
scripts/media-server.ts
scripts/setup-hls-fixture.sh
src/app/admin/page.tsx
src/app/api/account/route.ts
src/app/api/admin/route.ts
src/app/api/billing/route.ts
src/app/api/billing/webhook/route.ts
src/app/api/clubs/route.ts
src/app/api/invitations/route.ts
src/app/api/movies/route.ts
src/app/api/realtime-ticket/route.ts
src/app/api/register/route.ts
src/app/api/rooms/[id]/invitations/route.ts
src/app/api/rooms/[id]/route.ts
src/app/api/rooms/route.ts
src/app/billing/page.tsx
src/app/cinema.css
src/app/cinemas/[id]/page.tsx
src/app/cinemas/new/page.tsx
src/app/cinemas/page.tsx
src/app/globals.css
src/app/invite/[token]/page.tsx
src/app/layout.tsx
src/app/legal/page.tsx
src/app/login/page.tsx
src/app/movies/[id]/page.tsx
src/app/movies/page.tsx
src/app/page.tsx
src/app/profile/[username]/page.tsx
src/app/register/page.tsx
src/app/verify/page.tsx
src/app/watch/[id]/page.tsx
src/app/watchlist/page.tsx
src/components/auth-form.tsx
src/components/cinema-player.tsx
src/components/create-room-form.tsx
src/components/invitation-entry.tsx
src/components/room-client.tsx
src/components/screening-time.tsx
src/components/settings-form.tsx
src/components/theater-lobby.tsx
src/lib/billing.ts
src/lib/db.ts
src/lib/invitation-access.ts
src/lib/legacy/billing-page.tsx
src/lib/legacy/billing-route.ts
src/lib/legacy/billing-webhook.ts
src/lib/live.ts
src/lib/presence.ts
src/lib/realtime-audience.ts
src/lib/request-region.ts
src/lib/return-path.ts
src/lib/rooms.ts
src/lib/screenings.ts
src/lib/security.ts
src/lib/theater-limits.ts
src/lib/theaters.ts
src/lib/validation.ts
tests/e2e/acceptance.spec.ts
tests/e2e/community.spec.ts
tests/e2e/design.spec.ts
tests/e2e/helpers.ts
tests/e2e/player-recovery.spec.ts
tests/e2e/scaling.spec.ts
tests/e2e/security.spec.ts
tests/e2e/theaters.spec.ts
tests/e2e/worldwide.spec.ts
tests/unit/billing.test.ts
tests/unit/invitations.test.ts
tests/unit/rooms.test.ts
```
