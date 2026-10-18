# CineChat V1

A working social cinema built with Next.js 16, React 19, TypeScript, Tailwind CSS,
Motion, Auth.js, PostgreSQL/Prisma, Socket.IO and Redis. Original cinematic identity,
intentional dark/light themes, licensed open-film discovery, public/private screenings and server-authoritative
playback synchronization. This release extends the existing CineChat application.

Use the appearance control in the header to choose Dark, Light, or System. The
preference persists across reloads and tabs. The premium design, changed-file
inventory, artwork licenses, and inspected screenshots are documented in
[the redesign report](docs/REDESIGN.md).

Public theaters provide synchronized movies, live viewers, and seven temporary
emoji reactions only. Text chat is restricted to authorized private-theater
members. Everyone can create a private theater. Administrators create and schedule
public screenings, and control their shared timeline. Choose **Create theater**
to configure a film, seats, schedule, and optional private access code. The theater changes,
security checks, and screenshots are documented in [THEATERS.md](docs/THEATERS.md).
The latest audit, implementation, migrations, verification evidence, exact file
inventory, and preview requirements are in [V1-COMPLETION.md](docs/V1-COMPLETION.md).
The earlier free-theater upgrade is recorded in [FREE-THEATERS.md](docs/FREE-THEATERS.md). Both theater types and all atmospheres
are free; there are no subscription or payment requirements.

## Run locally

Requirements: Node.js 24, Docker Compose, curl and Python 3 for the official sample
archive. FFmpeg is required for the HLS browser-test fixture; a film backdrop is
already included. Only CineChat's
own database and Redis containers are created.

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

Open http://localhost:3000. Next.js runs on 3000, authenticated WebSockets on 3001,
and the separate licensed development media service on 3002. `setup:local`
generates private random secrets and preserves an existing `.env`.

Register with a username, email, password of at least 12 characters and birth date.
Development verification/reset emails are private JSON files in `.data/outbox/`.
Open the verification link in the newest matching file, click Verify email, and
sign in. This is an actual verification flow; the local outbox is never served over
HTTP and is disabled in production. Configure SMTP for real email delivery.

Two-browser private demo: register two users; host Big Buck Bunny in a private theater; create an
invitation; open it in the second browser; enter any separately shared room code;
join, play, chat and react. The creator gets an invitation automatically and can
configure its guest limit and expiry, share it, or revoke it. A guest may rejoin
while their invitation remains valid. Guests follow host playback. Audio starts muted to meet
browser autoplay restrictions; tap the volume control to enable it. Leave and
rejoin or reload to recover current authoritative playback and recent chat.
For a public screening, an administrator creates the screening and viewers join
from Live Cinemas. Public seat reservations expire after 45 seconds without an
authorized renewal; returning viewers recheck capacity. Private invitations keep
reserved membership while their grant is valid. Both viewers can
react with ❤️ 😂 😮 😢 👏 🔥 👍; public chat is rejected by the server.

Set `ADMIN_EMAILS` to your email **before registering** to create a verified admin.
Existing users are not silently promoted. Admin UI: `/admin`; every admin API
operation independently checks the database role. Never commit the `.env` file.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run media:hls-fixture
# Exercise the compiled app, two WebSocket workers and a loopback-only SMTP receiver:
E2E_PRODUCTION=true npm run test:e2e
E2E_PRODUCTION=true npm run test:mobile
npm audit --omit=dev
```

Playwright starts local web, two realtime workers and media services. It requires PostgreSQL,
Redis, seeded catalog, downloaded licensed sample, Chromium and WebKit:
`npx playwright install --with-deps chromium webkit`. The separate mobile command
uses Android/Chromium and iPhone/WebKit emulation; it does not test physical phones. Browser tests create local test users and data;
never point the test configuration at a production database. CI runs migrations,
licensed sample setup, unit tests, production build, and browser acceptance tests
against that build. Production browser tests configure a local SMTP receiver for
synthetic test addresses; the app’s production email safeguards stay enabled.
Design tests also run automated WCAG checks and save captures in
`test-results/redesign/`, `test-results/theaters/`, and `test-results/completion/`. CI retains browser reports
and screenshots for seven days.

## Features

- Persistent Auth.js sessions; credentials registration, email verification,
  one-time reset tokens, secure hashing, session revocation, Google OAuth boundary,
  profile settings, privacy, avatars and account deletion.
- Database-backed, paginated film discovery/search/genres, favorite films, watchlists,
  history, legal availability and licensed trailers. Stream URLs are excluded from
  public discovery responses. Metadata-only titles clearly show delivery limits.
- Administrator-managed public screenings, private cinema creation, scheduled global premieres, equal operational capacity limits, hashed
  invitation tokens, access codes, revocation, membership and host moderation.
- Direct HTML5/HLS media playback, host-controlled versioned playback, reconnect,
  late join, drift correction, seek, audio, fullscreen fallback, actual HLS quality
  selection where multiple renditions exist, subtitles, buffering and media recovery.
- Authenticated real-time private chat with timestamps and avatars. Both theater
  types have temporary synchronized emoji reactions, live presence, room reporting,
  blocking, muting, and shared rate limits. Public text chat is disabled at every boundary.
- Separate public/private discovery filters with refreshed viewer counts, a
  two-step theater creator, local-time screening dates, and free theater atmospheres.
- Following, friendship requests/acceptance, clubs, private profiles, notifications
  and idempotent in-app screening reminders. Private watching activity stays private.
- Admin users/rooms/reports, catalog creation, media-rights administration,
  and platform counts.
- Free access for every account. Legacy billing is isolated and hard disabled;
  both payment routes return 503 even if old credentials or flags are present.
- Redis-coordinated unique-user presence, batched fresh authorization, multi-worker
  fanout and server-authoritative scheduled starts; direct CDN media delivery.
- Real PostgreSQL migrations with foreign keys, indexes and safety constraints;
  health checks, Docker packaging, object-storage upload script and CI.

## External configuration and launch limits

Google OAuth, SMTP, managed PostgreSQL/Redis, and object storage/CDN require your
own credentials for hosted operation. Local cinema uses the private development
outbox and sample media server. No payment provider or subscription is required.
Historical billing models and implementation are retained for data compatibility
and are disconnected from active application routes and permissions.

Big Buck Bunny is delivered by a separate local service. Tears of Steel points to
an official Blender download; Sintel includes an official licensed trailer.
Other titles are discovery-only until authorized media delivery is configured.
Commercial films require distribution licenses. FrameXTV is disabled because API
and rights could not be verified. See [media research](docs/MEDIA-PROVIDERS.md).

Browser acceptance includes licensed MP4 and real two-rendition HLS media with
English/Spanish subtitle cues. The HLS test fixture has 90p/180p variants;
source rights and quality govern actual film playback. Google OAuth, external SMTP and S3/CDN delivery require operator smoke
tests. Chromium and WebKit emulation do not replace physical Android/iOS Safari testing.

Regional restrictions default to `REGION_DEFAULT`. For global licensed delivery,
configure `TRUSTED_COUNTRY_HEADER` behind a proxy that overwrites that header and
blocks direct origin access. The validated region is bound to signed WebSocket
tickets. Leaving this unset deliberately ignores client country headers.

No public deployment was performed. See [deployment instructions](docs/DEPLOYMENT.md),
[implementation checklist](docs/IMPLEMENTATION.md), and [delivery report](docs/DELIVERY.md).
