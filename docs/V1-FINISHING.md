# CineChat V1 finishing audit — 24 October 2026

Repository: GindausD2/Cinechat, baseline `802714c`. This extends the existing application; no framework/authentication/database replacement, payment flow, public text chat, merge or deployment is included.

## Audit and staged checklist

The existing stack is Next.js 16.4.3, React 19, TypeScript, Tailwind, Motion, Auth.js, Prisma/PostgreSQL, Socket.IO and Redis. Reviewed pages/components, API contracts, schema/indexes, session and membership validation, media rights, real-time playback/presence/chat, scheduling, notifications, history, design tokens and test/deployment scripts.

- [x] Stage 1 — Audit/stabilization. Clean baseline: lint, TypeScript, 37 unit tests across 14 files, production build and all 30 production browser cases pass (5.2 minutes). No pre-existing check failure.
- [x] Stage 2 — Keep working accounts/database/backend; finish persisted, authorized reminder preferences and delivery.
- [x] Stage 3 — Complete public/private waiting rooms and clear premiere countdowns without changing chat permissions.
- [x] Stage 4 — Keep authoritative playback/discovery; complete final progress persistence and an owner-only viewing-history experience.
- [x] Stage 5 — Verify new states in both themes at desktop/mobile sizes, keyboard accessibility and existing mobile engines.
- [x] Stage 6 — Run final checks, migrations, multi-user tests, dependency audit and document exact launch requirements.

## Already working and preserved

Verified baseline flows include signup/email verification/login/reset/deletion; movie search, genre filtering and details; public discovery and scheduled server-managed starts; private creation, invitation redemption/revocation and moderation; synchronized playback, subtitles/HLS quality, autoplay/buffering/error/reconnect recovery; public emoji-only enforcement across HTTP/WebSockets/fanout; private chat/history and membership checks; presence/rate limits; dark/light themes; account privacy/age/image consent; policy drafts; and disabled billing. Tests use separate browser contexts, PostgreSQL/Redis, two realtime workers, authorized sample media and loopback SMTP.

## Finishing gaps found

1. Scheduled screenings display dates and “Starts soon,” but lack an actual countdown/waiting-room experience. Upcoming controls remain clickable even though the backend rejects premature playback.
2. Reminder UI always initializes to off. Reloading loses the visible preference; cancellation requires room access even after a grant expires. The background sender checks active private membership but not current invitation expiration/revocation, blocks or bans.
3. Progress is saved only during periodic playback updates. A short film's final position can be lost. Completed films are absent from the home continuation row and have no dedicated owner-only viewing-history route.

Baseline checks passing does not establish coverage of these gaps. New regression failures and final evidence will be recorded below after implementation.

## Changes

Theater discovery and the home premiere collection show live countdowns from a server time sample. Waiting rooms include the poster, local start date/timezone, remaining time and persisted reminder choice. Their clock advances with `performance.now()` rather than trusting the device wall clock; room samples include half the measured round trip. A countdown reaching zero does not grant playback authority: public viewers wait for the server's scheduled playback event, while a private host can start at the scheduled time. Pre-start player controls are disabled. Private members can still chat before the film; public theaters remain emoji-only.

Reminder GET/POST routes initialize the visible preference from PostgreSQL and enforce authentication, validation and current room/media access. An owner can withdraw their own reminder after room access expires or a screening ends. Delivery is bounded to 500 candidates per batch and claims each notification transactionally, checking current membership, same-room invitation expiry/revocation, bans, blocks and account suspension. Delivery stays in-app, without adding email marketing or push services. The new expired-private-invitation regression reproduced an unwanted notification before the fix.

The shared player periodically saves progress and flushes on pause, end, page hide, document hide and unmount. Saves use a monotonic throttle and small `keepalive` requests for exits. `/history` reads only the signed-in user's latest 50 films; finished films offer Watch again, while unfinished films retain their position. The homepage has a Recently watched collection and links to full history. Watchlist also links to history. Browser verification finishes the actual 20-second licensed HLS excerpt through the player controls, then checks persisted completion, replay and isolation from another account.

The subsequent responsive work extends these changes rather than replacing them. See [RESPONSIVE.md](RESPONSIVE.md) for navigation, text scaling, small players, focus handling, HLS recovery and browser limits. Accounts, sessions, invitations, private messaging, presence, shared playback revisions, rights checks, moderation, privacy controls and disabled billing retain the existing architecture. No production user data was deleted or reset.

## Migration

`prisma/migrations/20261024000100_reminder_delivery_index/migration.sql` adds `ScreeningReminder(sentAt, roomId)` for pending delivery. This is an additive index; it does not modify or delete existing rows. Apply all outstanding migrations before starting the updated services:

```sh
npm run db:generate
npm run db:migrate
```

Local verification finds 11 applied migrations, an up-to-date schema and no difference between the migrated database and Prisma datamodel. Do not run a database reset for this release. Existing seed/media sources and privacy records are preserved.

## Verification record

The clean starting commit passed lint, TypeScript, 37 unit tests and 30 production browser cases. The saved finishing draft then needed an imperative subtitle mutation moved into a helper to satisfy React linting. Three countdown unit cases brought the total to 40 tests across 15 files; nine viewport-geometry cases subsequently bring it to 49 tests across 16 files. Subsequent browser diagnostics found the responsive overflows and a stale HLS error overlay; those fixes are documented in the responsive report. The 26 October full production acceptance rerun passes all 31 browser cases (8.1 minutes), including the new private-reminder regression. Lint, TypeScript, all 49 unit cases and the production build pass. Intermediate diagnostic failures are not reported as successful tests. Final cross-engine results are recorded in the responsive/adaptive reports.

## Run and launch

Use [README.md](../README.md) for the exact local setup and [DEPLOYMENT.md](DEPLOYMENT.md) for hosted infrastructure. No new runtime environment key was introduced. `E2E_PRODUCTION=true` browser tests provide loopback-only transactional SMTP; ordinary local development uses the private outbox. Never run fixture tests against a production database.

`npm run check:production` still fails intentionally on this local configuration: real SMTP, HTTPS app/auth/realtime origins, disabled local media/outbox, and verified operator/support/privacy/copyright/launch-country disclosures are required. Hosted operation additionally needs managed PostgreSQL/Redis and an authorized HTTPS media CDN with correct CORS, ranges, subtitles and rights. Google OAuth is optional and unverified without its credentials. External SMTP, object storage and actual launch-region behavior need operator smoke tests.

Preview status: suitable for local review after the recorded checks; no hosted preview or public deployment was performed. Before launch, test actual supported phones/browsers and HTTPS multi-user flows, verify infrastructure/backups/monitoring and approved content rights, complete founder/legal/child-safety review, run production preflight, then obtain explicit merge/deployment approval. Free V1 has no subscriptions or payments. Technical implementation does not guarantee legal compliance.

## External launch boundaries

Existing trust/legal findings remain in [TRUST-AUDIT.md](TRUST-AUDIT.md), SDK findings in [THIRD-PARTY-AUDIT.md](THIRD-PARTY-AUDIT.md), and asset/media restrictions in [ASSET-LICENSE-AUDIT.md](ASSET-LICENSE-AUDIT.md). No external credentials, commercial licenses, verified business contacts, parental-consent system or production infrastructure are fabricated. Technical controls do not guarantee legal compliance.
