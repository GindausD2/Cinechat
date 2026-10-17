# CineChat V1 delivery

> Historical baseline report. The current free-theater behavior and verification
> supersede this snapshot: [FREE-THEATERS.md](FREE-THEATERS.md).

This records the original foundation delivery. The subsequent premium interface,
expanded production browser verification, and current design captures are in
[REDESIGN.md](REDESIGN.md).

Selected repository: **GindausD2/Cinechat**, explicitly confirmed by the owner.
Baseline: `92b5a61a56d609802af5aa3850fca7a75d128a57` (README only).
Implementation branch: `feat/cinechat-v1`. No public deployment or live charges.

## Completed implementation

Original dark glass interface with local Inter/Montserrat fonts, reusable glass
primitives, responsive navigation, movie discovery, search and genre filtering.
Rights-aware movie details and trailers, profiles/favorites, watchlists/history,
settings and privacy. Recommendations use selected favorite genres with curated
fallbacks; trending/popular collections use stored weekly watchlist/history data.

Actual PostgreSQL/Prisma data, Auth.js credentials sessions and Google configuration
boundary, secure password hashing, email verification/reset, private development
outbox, persistent sessions, server-side authorization and account deletion.
Template/short secrets are rejected and bcrypt's 72-byte boundary is validated.

Public/private rooms, plan/capacity limits, schedules, membership, expiring and
revocable hashed invitations, optional hashed access codes, host moderation,
real-time chat/reactions/presence, host-only authoritative playback, seek, late join,
reload/reconnect recovery, periodic drift correction, volume and fullscreen.
HTML5/HLS and conditional authorized subtitle support are implemented.

Following/friendships, clubs, blocking, muting, reports/copyright review, privacy-
filtered activity, in-app notifications and idempotent screening reminders. Admin
management covers users, rooms, reports, movie metadata, media rights, subscription
overview and actual platform counts. Every admin API independently checks role.

Free/Pro enforcement; test-only Stripe checkout/portal/cancellation, invoice history,
signed webhook processing and event deduplication. No checkout return URL grants
entitlements. Live keys/events are rejected. S3 upload integration, local separate
media delivery, health checks, Docker packaging, environment guard and GitHub CI.

## Database migrations

1. `20261014085726_foundation`: all requested data entities, relational foreign
   keys, delete behavior, compound identifiers and lookup indexes.
2. `20261014094000_safety_constraints`: capacity and finite nonnegative playback
   positions, invitation use limits, nonempty messages, no self relationships,
   unordered friendship uniqueness, ordered license dates and enabled-source
   authorization. Custom SQL constraints are maintained through migrations.

Both migrations applied to the actual local PostgreSQL database. Prisma migration
status reports the schema is up to date. Redis supports shared rate counters,
authenticated event delivery and expiring room presence.

## Verification evidence

Final source verification passed lint, TypeScript, 21 unit tests in 9 files, a
production build, and all five browser tests. The full dependency audit (including
development tools) reports zero advisories. The final Docker image also built.
Browser acceptance uses two real sessions and a licensed 596-second MP4, not a
simulated player. It verifies registration/login, search/watchlists, private invite
and code rejection, synchronized advancing video, chat, reactions, host pause/resume,
leave/rejoin, reload recovery, private discovery exclusion and host authorization.

Additional browser tests verify responsive layouts without horizontal overflow,
following/friend acceptance/clubs, profile privacy, notifications, blocks, admin
permissions/session suspension, concurrent capacity enforcement, WebSocket host-only
controls/tampered tickets, muting/removal, report resolution, reminder deduplication,
one-time reset/session invalidation, disabled billing and data deletion.

The Docker image has been built locally. A production Next.js process in the image
passed `/api/health` against the local PostgreSQL/Redis containers. Production
configuration checks intentionally reject the local setup (HTTP origins, local
media/outbox and absent SMTP), preventing accidental promotion of a dev environment.

## Remaining launch work / external credentials

- Google client ID/secret and a provider OAuth smoke test.
- SMTP credentials, verified sender and real mail-delivery tests.
- Managed PostgreSQL/Redis with TLS, backups and infrastructure monitoring.
- Object storage/CDN credentials, HTTPS media hosts, approved production-quality
  encodes, range/CORS/subtitle/HLS validation, and protected-media entitlement signing
  if commercial licenses require it. S3 delivery is not exercised without credentials.
- Stripe test account, recurring price, webhook secret and billing portal setup;
  real Stripe test checkout/subscription events. Live charging is deliberately
  unavailable and needs a separately approved change.
- Trusted regional gateway/routing for a global launch; current V1 authorization
  uses a server-set launch region and ignores client-supplied country headers.
- Commercial film distribution agreements; per-title source approval and attribution.
  FrameXTV remains disabled pending a documented API contract and permissions.
- Operator identity, public support/copyright contact, retention and jurisdiction-
  specific privacy/billing terms before public release.

The local social cinema is working and tested. Hosted integrations and commercial
film distribution are configuration/licensing boundaries, not verified live services.
Sample delivery is 320×180; high-quality media requires approved assets. HLS/subtitle
code is implemented, but browser playback acceptance uses the licensed MP4 sample.

## Run and deploy

See [README](../README.md) for local commands and development email verification.
See [deployment instructions](DEPLOYMENT.md) for web/realtime services, database,
Redis, object storage, media rights, Stripe test mode, health checks and release jobs.
See [media investigation](MEDIA-PROVIDERS.md) for FrameXTV and open-film evidence.

## Files changed

The inventory below contains the app's tracked implementation files. Runtime
secrets, email outbox, downloaded media, dependencies, build output and test traces
are excluded by `.gitignore` and `.dockerignore`.

```text
.dockerignore
.env.example
.github/workflows/ci.yml
.gitignore
AGENTS.md
Dockerfile
README.md
compose.yaml
docs/DELIVERY.md
docs/DEPLOYMENT.md
docs/IMPLEMENTATION.md
docs/MEDIA-PROVIDERS.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
postcss.config.mjs
prisma/migrations/20261014085726_foundation/migration.sql
prisma/migrations/20261014094000_safety_constraints/migration.sql
prisma/migrations/migration_lock.toml
prisma/schema.prisma
prisma/seed.ts
public/art/bunny-backdrop.jpg
public/art/bunny.svg
public/art/caminandes.svg
public/art/cosmos.svg
public/art/elephants.svg
public/art/sintel.svg
public/art/steel.svg
realtime/server.ts
scripts/check-production.mjs
scripts/media-server.ts
scripts/reminders.ts
scripts/setup-local.mjs
scripts/setup-media.sh
scripts/upload-media.ts
src/app/admin/page.tsx
src/app/api/account/email/route.ts
src/app/api/account/route.ts
src/app/api/admin/route.ts
src/app/api/auth/[...nextauth]/route.ts
src/app/api/billing/route.ts
src/app/api/billing/webhook/route.ts
src/app/api/clubs/route.ts
src/app/api/community/route.ts
src/app/api/health/route.ts
src/app/api/history/route.ts
src/app/api/invitations/route.ts
src/app/api/movies/route.ts
src/app/api/notifications/route.ts
src/app/api/realtime-ticket/route.ts
src/app/api/register/route.ts
src/app/api/reminders/route.ts
src/app/api/reports/route.ts
src/app/api/rooms/[id]/route.ts
src/app/api/rooms/route.ts
src/app/api/watchlist/route.ts
src/app/billing/page.tsx
src/app/cinema.css
src/app/cinemas/[id]/page.tsx
src/app/cinemas/new/page.tsx
src/app/cinemas/page.tsx
src/app/clubs/[id]/page.tsx
src/app/clubs/page.tsx
src/app/community.css
src/app/community/page.tsx
src/app/error.tsx
src/app/forgot-password/page.tsx
src/app/globals.css
src/app/invite/[token]/page.tsx
src/app/layout.tsx
src/app/legal/page.tsx
src/app/login/page.tsx
src/app/movies/[id]/page.tsx
src/app/movies/page.tsx
src/app/not-found.tsx
src/app/notifications/page.tsx
src/app/page.tsx
src/app/profile/[username]/page.tsx
src/app/register/page.tsx
src/app/resend-verification/page.tsx
src/app/reset-password/page.tsx
src/app/settings/page.tsx
src/app/verify/page.tsx
src/app/watch/[id]/page.tsx
src/app/watchlist/page.tsx
src/auth.ts
src/components/action-button.tsx
src/components/admin-catalog-form.tsx
src/components/auth-form.tsx
src/components/avatar.tsx
src/components/billing-button.tsx
src/components/cinema-player.tsx
src/components/create-club-form.tsx
src/components/create-room-form.tsx
src/components/glass.tsx
src/components/join-room.tsx
src/components/movie-card.tsx
src/components/movie-search.tsx
src/components/navbar.tsx
src/components/notifications.tsx
src/components/reminder-button.tsx
src/components/resend-verification.tsx
src/components/room-client.tsx
src/components/settings-form.tsx
src/components/solo-player.tsx
src/components/watchlist-button.tsx
src/lib/api.ts
src/lib/billing.ts
src/lib/catalog.ts
src/lib/community.ts
src/lib/db.ts
src/lib/env.ts
src/lib/events.ts
src/lib/live.ts
src/lib/mail.ts
src/lib/media.ts
src/lib/money.ts
src/lib/object-storage.ts
src/lib/playback.ts
src/lib/providers.ts
src/lib/realtime-auth.ts
src/lib/redis.ts
src/lib/reminders.ts
src/lib/rooms.ts
src/lib/security.ts
src/lib/server-time.ts
src/lib/session.ts
src/lib/validation.ts
src/types/auth.d.ts
src/types/mail.d.ts
tests/e2e/acceptance.spec.ts
tests/e2e/community.spec.ts
tests/e2e/helpers.ts
tests/e2e/security.spec.ts
tests/unit/billing.test.ts
tests/unit/env.test.ts
tests/unit/media.test.ts
tests/unit/money.test.ts
tests/unit/playback.test.ts
tests/unit/realtime-auth.test.ts
tests/unit/rooms.test.ts
tests/unit/security.test.ts
tests/unit/storage.test.ts
tsconfig.json
vitest.config.ts
```
