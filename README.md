# CineChat V1

A working social cinema built with Next.js 16, React 19, TypeScript, Tailwind CSS,
Motion, Auth.js, PostgreSQL/Prisma, Socket.IO and Redis. Original cinematic identity,
intentional dark/light themes, licensed open-film discovery, public/private screenings and server-authoritative
playback synchronization. This release extends the existing CineChat application.

Use the appearance control in the header to choose Dark, Light, or System. The
preference persists across reloads and tabs. The premium design, changed-file
inventory, artwork licenses, and inspected screenshots are documented in
[the redesign report](docs/REDESIGN.md).

The current responsive audit, browser matrix, screenshots and device limitations
are in [RESPONSIVE.md](docs/RESPONSIVE.md) and [ADAPTIVE.md](docs/ADAPTIVE.md). Scheduled waiting rooms, persistent
reminders and viewing-history changes are recorded in
[V1-FINISHING.md](docs/V1-FINISHING.md).

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
E2E_PRODUCTION=true npm run test:responsive
npm audit
```

Playwright starts local web, two realtime workers and media services. It requires PostgreSQL,
Redis, seeded catalog, downloaded licensed sample, Chromium, WebKit and Firefox:
`npx playwright install --with-deps chromium webkit firefox`. The separate mobile command
uses Android/Chromium and iPhone/WebKit emulation; it does not test physical phones. Browser tests create local test users and data;
never point the test configuration at a production database. CI runs migrations,
licensed sample setup, unit tests, production build, and browser acceptance tests
against that build. Production browser tests configure a local SMTP receiver for
synthetic test addresses; the app’s production email safeguards stay enabled.
Design tests also run automated WCAG checks and save captures in
`test-results/redesign/`, `test-results/theaters/`, `test-results/completion/`, and
`test-results/responsive/`. The responsive suite checks all eleven requested
widths plus 2560/3440px ultrawide layouts in both themes, long content, 200% text, constrained-height forms, private
chat, waiting rooms, subtitles and fullscreen focus. Additional tests retain the same player, socket and draft through folding-style resizes and exercise Chromium's native viewport-segment emulation. Physical folding hardware is not certified. CI retains browser reports
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
  and persisted, idempotent in-app screening reminders that recheck private grants
  at delivery. Private watching activity stays private.
- Server-timed premiere countdowns and waiting rooms; owner-only viewing history,
  completed-film replay, and final progress saving when leaving or pausing.
- Responsive safe-area navigation, reflowing long content, scalable text and compact
  player settings. Small portrait players place reactions and controls below the
  film. HLS loads its library on demand for MediaSource quality controls and uses
  native playback as a fallback; native-only browsers avoid the library.
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
tests. Linux Chromium, WebKit and Firefox checks and mobile emulation do not replace
physical Android/iOS Safari, macOS Safari or Microsoft Edge testing.

Regional restrictions default to `REGION_DEFAULT`. For global licensed delivery,
configure `TRUSTED_COUNTRY_HEADER` behind a proxy that overwrites that header and
blocks direct origin access. The validated region is bound to signed WebSocket
tickets. Leaving this unset deliberately ignores client country headers.

No public deployment was performed. See [deployment instructions](docs/DEPLOYMENT.md),
[implementation checklist](docs/IMPLEMENTATION.md), and [delivery report](docs/DELIVERY.md).

## Privacy, safety and transparency

The October 2026 trust update adds dedicated policies, cookie/image choices, versioned form acknowledgements, account export and email-confirmed deletion. Read [the audit and release evidence](docs/TRUST-AUDIT.md), [exact changed paths](docs/TRUST-FILES.md), [third-party inventory](docs/THIRD-PARTY-AUDIT.md), and [asset/rights audit](docs/ASSET-LICENSE-AUDIT.md). These changes do not establish legal compliance.

Apply the additive migrations with `npm run db:migrate`. The real-time worker runs bounded expired-credential/deleted-text cleanup hourly. `npm run privacy:cleanup` previews cleanup counts; `npm run privacy:cleanup -- --apply` processes a batch. Accounts, active messages and legacy billing records are not removed by maintenance. Founder-supplied public contact/operator variables are listed in `.env.example`. `MINIMUM_ACCOUNT_AGE` is a service policy, not a universal consent age; parental-consent verification is not implemented.

Run `npm run check` and `E2E_PRODUCTION=true npm run test:e2e` for code, policy, accessibility, privacy, account and theater checks. Use only local fixture infrastructure for these tests. No merge or public deployment is performed without approval.
