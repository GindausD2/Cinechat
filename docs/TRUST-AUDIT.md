# CineChat trust and safety audit — 22–23 October 2026

Scope: GindausD2/Cinechat, starting at `63f0f3a`. Existing Next.js 16 / React 19 / Auth.js / PostgreSQL / Prisma / Socket.IO / Redis architecture is preserved. No merge, public deployment, payment integration, or production data reset is authorized.

## Baseline

- Clean working tree. Existing lint, TypeScript, 32 unit tests, and production build pass.
- Existing 22-browser-test suite passed before changes (5.1 minutes). No baseline lint, type, test or build failures.
- `npm audit`: two moderate development-only findings (`vitest`, `@vitest/mocker`); no high/critical findings. Investigate safe updates. Runtime dependencies will be audited separately.
- No analytics, advertising, fingerprinting, embedded social widgets, camera, microphone, or geolocation SDK found. Auth.js cookies and `cinechat-theme` local storage are present. Google sign-in is conditional on credentials. Fonts/artwork are local; arbitrary HTTPS avatars/custom catalog images currently contact third parties directly.

## Findings and implementation outcomes

| # | Requirement | Audit finding / intended change |
| --- | --- | --- |
| 1 | Privacy | Implemented `/legal/privacy` describing actual data, private processing, provider/transfer uncertainties, retention, account rights and founder contact gaps. |
| 2 | Terms | Implemented `/legal/terms`; operator, governing-law/dispute, consumer, child-safety and appeal provisions explicitly require founder/legal review. |
| 3 | Refunds | `/legal/refunds` explains free V1 and no applicable subscription refunds; no payment flows added. |
| 4 | Cookies | `/legal/cookies` inventories Auth.js session/CSRF/callback/OAuth cookies, theme storage and versioned external-image preferences with their actual lifetimes. |
| 5 | Consent | Optional external images are blocked before permission. Equal accept/reject/customize actions appear when needed; choices expire after 180 days and can be changed in the footer. No analytics SDK or fake tracking toggle added. |
| 6 | Forms | Registration requires unchecked Terms, Privacy acknowledgement and local age/permission declaration. Provider-created accounts have a one-time review/profile flow, preserving invitations. Server guards prevent new theater creation/joining without a record. Export/deletion stay accessible without agreement. PolicyAcceptance stores user/version/time; no IP or device ID. |
| 7 | Minimize data | New floating reactions are ephemeral; chat deletion erases text, including retry paths. New Google links omit API tokens; bounded maintenance clears old unused tokens. New profiles/friend requests start private, existing preferences are preserved, and age data is server-only except owner export. |
| 8 | SDKs | Removed unused Stripe SDK, archived its unreachable implementation as .txt, kept ledger models/records and hard-disabled routes. Patched Vitest 4.1.12 and Next.js 16.4.3 after newly published critical/high advisories; full audit now reports zero advisories. Complete purpose/data/version/outdated inventory: THIRD-PARTY-AUDIT.md. |
| 9 | Dark patterns | Leave immediately removes the player/connection even offline; expired members can leave idempotently without reviving bans. Deletion offers password or short-lived email confirmation, with consequences and request/result confirmation. No forced password creation for provider accounts. |
| 10 | Fees | Free access and shared operational limits preserved. Billing endpoint/webhook tests reject payment activation, including legacy enabled flags. No fees or checkout. |
| 11 | Reviews | No fabricated testimonials/reviews found or added. Seed fabricates no people, rooms or payments. Actual database/Redis counts remain; starter catalog is disclosed and zero-activity collections use editorial labels. |
| 12 | Claims | Copy explains starter/open-film availability, source/country restrictions, finite capacity and the absence of verified unlimited scale or worldwide commercial rights. Private chat does not claim end-to-end encryption or absolute secrecy. |
| 13 | Alt text | Poster/film artwork labels retained. Avatars now have image semantics, named initials fallback and consent-aware image loading; decorative artwork remains excluded from accessibility names. |
| 14 | Contrast | Form borders exceed 3:1 in both themes; primary blue/white is 5.17:1. Removed cross-theme color interpolation causing transient low contrast. New AA/2.2-tag scans cover policies, contact, settings and dialogs; automated scans are not WCAG certification. |
| 15 | Keyboard | Native focus-trapping dialogs, Escape/focus restoration, visible outlines, keyboard theme controls and player controls preserved/tested. New consent labels have 44px interaction height; mobile safe areas and reduced motion retained. |
| 16 | Business details | `/contact` renders founder-supplied public configuration or explicit “Not supplied” placeholders. Launch preflight rejects missing operator/support/privacy/copyright/country values. Entity/address/registration disclosures still require verified founder input. |
| 17 | Age/safety | Service floor is configurable (13–21); existing 13 floor retained pending founder choice, expressly not a worldwide consent rule. Under-18/missing-age accounts cannot expose profiles/activity or make new discovery connections, including legacy unsafe flags. Birth-date changes cannot bypass checks. Parental verification is not implemented; younger-user launch remains a legal/safety blocker. |
| 18 | Unsubscribe | Verified only essential verification/reset/requested-deletion messages exist; no mailing list, marketing SDK or marketing unsubscribe mechanism is needed in current V1. No marketing was added. In-app screening reminders remain cancelable. Future marketing needs distinct opt-in and unsubscribe before activation. |
| 19 | Assets | Complete local Inter/Montserrat OFL and Lucide/Feather notices are publicly linked. Artwork authors/license links and transformations are displayed. Official Blender license pages were inspected; trailer metadata alone no longer authorizes playback. ASSET-LICENSE-AUDIT.md records exclusions, caption limits and custom/legacy provenance checks. |
| 20 | Deletion | Password or hashed one-time 15-minute email token plus same-account session/email confirmation. New requests revoke earlier links; expired/cross-account links rejected. Transaction consumes proof/deletes records; linked notifications and non-FK moderation targets are removed, live access is revoked, and receipt is displayed. Export omits credentials and others' private text. External copies/backups require operator handling. |

## Phases

- [x] Audit architecture, schema, forms, storage, media, dependencies, and baseline checks.
- [x] Close data-minimization/access/deletion/leave issues with focused tests.
- [x] Add accurate policies, contacts, conditional image consent, form acknowledgement and age safeguards.
- [x] Audit assets/dependencies and verify interface accessibility on desktop/mobile in both themes.
- [x] Run unit/integration/browser suites, migration validation, lint/typecheck/build; record limitations and founder/legal decisions.

Technical safeguards and documentation do not determine legal compliance. Hosting locations, processors, backup/log retention, legal bases, international transfer mechanisms, operator identity, launch territories and applicable child-safety duties require founder verification and qualified legal review.

## Existing functionality preserved

The current authentication/session checks and password hashing, PostgreSQL database, Redis/Socket.IO infrastructure, authoritative playback/revisions, invitations, presence leases, movie discovery/search, watchlists/history, clubs/friendships, reminders and administrator moderation were reused. Core playback, invitation validation, shared delivery queues, rate limiting and screening scheduling were not replaced. Public theaters still reject text/history across HTTP, WebSockets and fanout; private theaters retain authorized chat, emoji reactions and host controls. Both remain free. No database reset, user-profile backfill, framework replacement, second authentication system or public deployment was introduced.

## Migrations and data safety

Four new forward migrations; apply using `npm run db:migrate` (Prisma migrate deploy). Never use reset/db-push against production.

1. `20261022000100_policy_acceptance`: PolicyAcceptance with user FK/cascade and user/version uniqueness; nullable Notification.actorId FK/cascade and index. No fabricated acceptance backfill.
2. `20261022000200_privacy_retention_indexes`: indexes for expired auth/session/verification records and old floating reactions.
3. `20261022000300_deleted_message_redaction`: preserves nonempty live messages while allowing empty deletion tombstones. Existing records remain valid; maintenance redacts already-deleted bodies.
4. `20261022000400_private_profile_defaults`: private-profile/friend-request defaults for future accounts only. Existing stored choices are not rewritten.

The real-time worker runs privacy maintenance hourly through a shared Redis lease, up to 500 rows per category per run. It removes expired credentials/old floating-reaction metadata and redacts already-deleted text/unused Google tokens. It does not purge active messages, users, rooms or legacy payments. Monitor cleanup backlog and run additional batches when needed. Active private-chat, open-report and backup/log retention still need a necessity/legal review; no invented fixed deadline or legal hold is claimed.

## Verification evidence

Baseline: lint, TypeScript, 32 unit tests and production build passed; 22 browser tests passed before changes. Initial new privacy tests exposed the old nonempty-message constraint, offline-navigation behavior and color interpolation; those were corrected and focused checks passed. This was not a pre-existing baseline test failure.

Final local results on 23 October 2026, using Next.js 16.4.3:

| Command / check | Result |
| --- | --- |
| `npm run check` | PASS: ESLint, TypeScript, 37 unit tests across 14 files, optimized production build. |
| `E2E_PRODUCTION=true npm run test:e2e` | PASS: 30 tests (6.1 minutes), real PostgreSQL/Redis, two realtime workers, loopback SMTP and separate licensed media delivery. |
| `E2E_PRODUCTION=true npm run test:mobile` | PASS: both Android/Chromium and iPhone/WebKit emulation cases, each using two independent contexts, private chat and public emoji-only viewing, dark/light themes, portrait/landscape and fullscreen. Physical phones/Safari are not certified. |
| `npm run db:migrate` / `prisma migrate status` | PASS: all 10 migrations applied, including the four trust migrations; no reset. |
| Read-only Prisma migrate diff against the live local database | PASS: no difference detected. |
| `npm audit` | PASS: zero known vulnerabilities in runtime and development dependencies after the Vitest and Next.js patches. |
| `npm run privacy:cleanup` | PASS: dry-run counts only; bounded apply/retention preservation covered by integration tests. |
| `npm run check:production` | Correctly BLOCKS local configuration: missing SMTP, HTTP origins, local delivery/outbox enabled, missing founder operator/contact/country disclosures. This is not a production-ready configuration. |
| Visual review | All 16 new unmodified policy/contact/cookie/deletion captures opened and inspected at 1440px and 390px in dark/light themes. Saved in [trust-release](trust-release/); no horizontal overflow or clipped dialog actions observed. |

The browser suite covers real browser → API → PostgreSQL/Redis → WebSocket → browser flows: explicit acknowledgement, image requests/cookies, public identity minimization, private presence revocation, account export, same-account email deletion (passwordless credential state), redaction retries, expired-token cleanup, and onboarding with invitation recovery. Actual Google authorization requires credentials and is not claimed verified.

Security scenarios pass for public message rejection through HTTP/WebSockets/history/fanout, reaction/message rate limits, non-admin public playback rejection, non-host private playback rejection, invalid/expired/revoked invitations, removed members, private-presence authorization before broker removal, CSRF/session checks, same-account deletion proof, concurrent deletion-link issuance and data cascades. Two independent browser contexts exercise real messaging/playback, asymmetric network delay, a 90-second device-clock skew and reconnect recovery. A local 100-synthetic-viewer test spans two realtime workers; it is not a multi-region capacity certification. Existing regional access, HLS subtitle cues/quality, autoplay/buffering recovery and both theater layouts remain covered.

Four additional iPhone/WebKit theater viewport captures (public/private, dark/light) were opened and visually inspected. The restricted local runner uses its preserved WebKit wrapper and grants `/var/tmp` for WebKit media buffers; standard CI installs the browser system dependencies.

Automated accessibility scans use WCAG 2 A/AA, 2.1 AA and 2.2 AA tags on both themes and desktop/mobile views. Keyboard consent activation, native dialog Escape/focus restoration, visible focus and no overflow are checked. These checks do not establish full WCAG conformance, screen-reader usability, complete movie captions or physical-device compatibility.

## Run and configuration

Use Node.js 24, PostgreSQL 17, Redis 7 and FFmpeg for the HLS fixture. Preserve an existing `.env`; `npm run setup:local` preserves it and generates private local secrets only when needed. Full configuration is in [`.env.example`](../.env.example) and the [README](../README.md).

```sh
npm ci
npm run setup:local
npm run infra:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run media:setup
npm run media:hls-fixture
npx playwright install --with-deps chromium webkit
npm run check
# Stop any manually started web/realtime/media processes before these commands.
E2E_PRODUCTION=true npm run test:e2e
E2E_PRODUCTION=true npm run test:mobile
npm audit
npm run dev
```

The tests create synthetic accounts and messages in local fixture infrastructure; never run them against production data. The optional development outbox stays on the filesystem. Compiled browser tests use a loopback SMTP receiver rather than disabling production mail safeguards. Existing databases receive only forward migrations; no reset is needed.

Required deployment configuration includes `DATABASE_URL`, `REDIS_URL`, distinct random `AUTH_SECRET` / `REALTIME_SECRET`, `AUTH_URL`, `APP_ORIGIN`, `NEXT_PUBLIC_WS_URL`, `SMTP_URL`, `EMAIL_FROM`, approved `MEDIA_ALLOWED_HOSTS` and region settings. Set verified `CINECHAT_OPERATOR_NAME`, `CINECHAT_SUPPORT_EMAIL`, `CINECHAT_PRIVACY_EMAIL`, `CINECHAT_COPYRIGHT_EMAIL` and `CINECHAT_LAUNCH_COUNTRIES`; legal entity/address fields depend on the actual operator. Review `MINIMUM_ACCOUNT_AGE` before launch. Google credentials and object-storage/CDN credentials are optional integrations requiring separate smoke tests. No payment keys are needed. Disable local-media/outbox flags and pass `npm run check:production` before a hosted release; that preflight does not replace legal or infrastructure review.

Exact file paths and descriptions are listed in [TRUST-FILES.md](TRUST-FILES.md). Source/asset findings are in [THIRD-PARTY-AUDIT.md](THIRD-PARTY-AUDIT.md) and [ASSET-LICENSE-AUDIT.md](ASSET-LICENSE-AUDIT.md).

## Founder and legal review still required

- Verified responsible operator/entity, support/privacy/copyright contacts, registered-business disclosures where applicable, supported territories, governing law/disputes and required consumer notices.
- Actual processors/subprocessors and processing countries, hosting/CDN/email contracts, international-transfer arrangements, infrastructure log/backup retention and access controls.
- Launch age policy, any necessary age assurance/parental-consent implementation and jurisdiction-specific child-safety/reporting obligations. Current self-declaration is not verified parental permission.
- Necessity/retention limits for private chat, ended theaters, free-text reports and audit records; handling of copies in other members' devices/providers and any real historical financial records.
- Rights evidence for each custom asset, licensed regional content and subtitle track; trusted country-header/CDN/origin enforcement for restricted media. No commercial catalog clearance or DRM integration is claimed.
- Formal copyright notice/counter-notice, support/escalation and moderation appeal processes; publish monitored contacts before launch.
- Manual assistive-technology review, complete movie captions/transcripts and real iPhone/Android hardware testing. Automated axe checks and browser-device emulation do not establish full accessibility conformance.
- Production SMTP/HTTPS origins, private Postgres/Redis, secure media delivery and deployed cookie/header/provider smoke tests. Google OAuth and external delivery infrastructure are not verified without their credentials.

Local preview review is the appropriate next step; public launch is not approved or certified. No merge or deployment has been performed.
