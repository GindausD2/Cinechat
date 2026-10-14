# CineChat V1

A working social cinema built with Next.js 16, React 19, TypeScript, Tailwind CSS,
Motion, Auth.js, PostgreSQL/Prisma, Socket.IO and Redis. Original cinematic identity,
intentional dark/light themes, licensed open-film discovery, public/private screenings and server-authoritative
playback synchronization. The original repository contained only a README:
“Watch movies with friends in black & white.”

Use the appearance control in the header to choose Dark, Light, or System. The
preference persists across reloads and tabs. The premium design, changed-file
inventory, artwork licenses, and inspected screenshots are documented in
[the redesign report](docs/REDESIGN.md).

Public theaters provide synchronized movies, live viewers, and seven temporary
emoji reactions only. Text chat is restricted to authorized private-theater
members. Choose **Create theater**, select Public or Private, then configure the
film, seats, schedule, and optional private access code. The theater changes,
security checks, and screenshots are documented in [THEATERS.md](docs/THEATERS.md).

## Run locally

Requirements: Node.js 24, Docker Compose, curl and Python 3 for the official sample
archive. FFmpeg is optional; a film backdrop is already included. Only CineChat's
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
join, play, chat and react. Guests follow host playback. Audio starts muted to meet
browser autoplay restrictions; tap the volume control to enable it. Leave and
rejoin or reload to recover current authoritative playback and recent chat.
For a public screening, the second user joins from Live Cinemas. Both viewers can
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
npm run test:e2e
# Exercise the compiled app and a loopback-only SMTP receiver:
E2E_PRODUCTION=true npm run test:e2e
npm audit --omit=dev
```

Playwright starts local web, realtime and media services. It requires PostgreSQL,
Redis, seeded catalog, downloaded licensed sample and Chromium:
`npx playwright install chromium`. Browser tests create local test users and data;
never point the test configuration at a production database. CI runs migrations,
licensed sample setup, unit tests, production build, and browser acceptance tests
against that build. Production browser tests configure a local SMTP receiver for
synthetic test addresses; the app’s production email safeguards stay enabled.
Design tests also run automated WCAG checks and save captures in
`test-results/redesign/` and `test-results/theaters/`. CI retains browser reports
and screenshots for seven days.

## Features

- Persistent Auth.js sessions; credentials registration, email verification,
  one-time reset tokens, secure hashing, session revocation, Google OAuth boundary,
  profile settings, privacy, avatars and account deletion.
- Database-backed film discovery/search/genres, favorite films, watchlists,
  history, legal availability and licensed trailers. Stream URLs are excluded from
  public discovery responses. Metadata-only titles clearly show delivery limits.
- Public/private cinema creation, schedules, capacity and plan limits, hashed
  invitation tokens, access codes, revocation, membership and host moderation.
- Direct HTML5/HLS media playback, host-controlled versioned playback, reconnect,
  late join, drift correction, seek, audio, fullscreen and subtitle track support.
- Authenticated real-time private chat with timestamps and avatars. Both theater
  types have temporary synchronized emoji reactions, live presence, room reporting,
  blocking, muting, and shared rate limits. Public text chat is disabled at every boundary.
- Separate public/private discovery filters with refreshed viewer counts, a
  two-step theater creator, and persisted blue/midnight Pro atmospheres.
- Following, friendship requests/acceptance, clubs, private profiles, notifications
  and idempotent in-app screening reminders. Private watching activity stays private.
- Admin users/rooms/reports, catalog creation, media-rights administration,
  subscription overview and platform counts.
- Free/Pro enforcement and Stripe **test-only** checkout, billing portal,
  cancellation, invoice history and signature-verified idempotent webhooks.
- Real PostgreSQL migrations with foreign keys, indexes and safety constraints;
  health checks, Docker packaging, object-storage upload script and CI.

## External configuration and launch limits

Google OAuth, SMTP, managed PostgreSQL/Redis, object storage/CDN and Stripe require
your own credentials. Free local cinema works without those hosted accounts. V1
rejects live Stripe keys even if billing is enabled; live charges need a separately
approved launch change. Checkout return URLs never grant Pro. Supported countries,
price, currency, tax/refund terms and payment availability must be selected for the
operator's actual Stripe account before launch.

Big Buck Bunny is delivered by a separate local service. Tears of Steel points to
an official Blender download; Sintel includes an official licensed trailer.
Other titles are discovery-only until authorized media delivery is configured.
Commercial films require distribution licenses. FrameXTV is disabled because API
and rights could not be verified. See [media research](docs/MEDIA-PROVIDERS.md).

HLS and subtitle support are implemented; acceptance uses a licensed MP4 sample.
External Google/SMTP/Stripe/S3 delivery cannot be verified without credentials.
The sample film is 320×180; production quality depends on approved source media.
Global regional routing requires a trusted regional gateway; V1 uses a server-set
launch region and ignores client-supplied country headers.

No public deployment was performed. See [deployment instructions](docs/DEPLOYMENT.md),
[implementation checklist](docs/IMPLEMENTATION.md), and [delivery report](docs/DELIVERY.md).
