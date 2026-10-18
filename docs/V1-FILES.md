# CineChat V1 changed files

Changes relative to audited baseline `b202306b`. No files were deleted.

**82 changed/added files.** Existing environment files, authentication/account/social APIs, media licensing seed, Docker/Compose and theme provider were retained.

| Exact path | Description |
| --- | --- |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Install Chromium/WebKit and run the mobile engine acceptance job. |
| [README.md](../README.md) | Current product policy, setup, administrator workflow, tests and release report. |
| [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Lease/queue coordination, recovery limits, subtitles and current release reference. |
| [docs/V1-COMPLETION-AUDIT.md](../docs/V1-COMPLETION-AUDIT.md) | Baseline evidence, phased checklist and subsequently found reliability gaps. |
| [docs/V1-COMPLETION.md](../docs/V1-COMPLETION.md) | Completed behavior, reuse, migrations, test evidence, security, run/configuration and launch limits. |
| [docs/V1-FILES.md](../docs/V1-FILES.md) | Exact changed-file inventory for this release. |
| [docs/v1-release/concurrency.json](../docs/v1-release/concurrency.json) | Recorded local concurrency measurement. |
| [docs/v1-release/discovery-desktop-dark.png](../docs/v1-release/discovery-desktop-dark.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/discovery-desktop-light.png](../docs/v1-release/discovery-desktop-light.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/private-desktop-dark.png](../docs/v1-release/private-desktop-dark.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/private-desktop-light.png](../docs/v1-release/private-desktop-light.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/private-mobile-dark.png](../docs/v1-release/private-mobile-dark.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/private-mobile-fullscreen.png](../docs/v1-release/private-mobile-fullscreen.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/private-mobile-light.png](../docs/v1-release/private-mobile-light.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/public-desktop-dark.png](../docs/v1-release/public-desktop-dark.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/public-desktop-light.png](../docs/v1-release/public-desktop-light.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/public-mobile-dark.png](../docs/v1-release/public-mobile-dark.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/public-mobile-fullscreen.png](../docs/v1-release/public-mobile-fullscreen.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [docs/v1-release/public-mobile-light.png](../docs/v1-release/public-mobile-light.png) | Unmodified browser capture opened for visual review; licensed open-film artwork. |
| [package.json](../package.json) | Add the separate mobile acceptance command; dependencies are preserved. |
| [playwright.mobile.config.ts](../playwright.mobile.config.ts) | Android/Chromium and iPhone/WebKit emulation projects and isolated artifacts. |
| [prisma/migrations/20261018000100_private_message_delivery/migration.sql](../prisma/migrations/20261018000100_private_message_delivery/migration.sql) | Additive SQL migration; apply using npm run db:migrate. |
| [prisma/migrations/20261018000200_catalog_subtitles/migration.sql](../prisma/migrations/20261018000200_catalog_subtitles/migration.sql) | Additive SQL migration; apply using npm run db:migrate. |
| [prisma/migrations/20261018000300_public_seat_leases/migration.sql](../prisma/migrations/20261018000300_public_seat_leases/migration.sql) | Additive SQL migration; apply using npm run db:migrate. |
| [prisma/schema.prisma](../prisma/schema.prisma) | Message retry key, subtitle relation/model and catalog/seat indexes. |
| [realtime/server.ts](../realtime/server.ts) | Authenticated public seat reservation, bounded delivery/backpressure, private deletion, fresh authorization, subscriber recovery and bounded heartbeat renewal. |
| [scripts/setup-hls-fixture.sh](../scripts/setup-hls-fixture.sh) | Add an original Spanish WebVTT fixture beside existing licensed test media. |
| [src/app/admin/page.tsx](../src/app/admin/page.tsx) | Administrator entry point for scheduling public screenings. |
| [src/app/api/admin/route.ts](../src/app/api/admin/route.ts) | Validate, preserve/replace and audit authorized subtitle assets transactionally. |
| [src/app/api/movies/route.ts](../src/app/api/movies/route.ts) | Paginated metadata API with validated cursors and bounded page size. |
| [src/app/api/rooms/[id]/route.ts](../src/app/api/rooms/[id]/route.ts) | Private deletion action, administrator public permissions, invitation/end audit. |
| [src/app/api/rooms/route.ts](../src/app/api/rooms/route.ts) | Region/age-aware discovery, movie filtering and ended-screening selection. |
| [src/app/cinema.css](../src/app/cinema.css) | Screening poster cards, theme contrast, measured player controls, safe areas and reaction visibility. |
| [src/app/cinemas/[id]/page.tsx](../src/app/cinemas/[id]/page.tsx) | Valid private grants and explicit public seat rejoin after lease expiry. |
| [src/app/cinemas/new/page.tsx](../src/app/cinemas/new/page.tsx) | Administrator-only public creation option while preserving private creation. |
| [src/app/cinemas/page.tsx](../src/app/cinemas/page.tsx) | Past-screening navigation and authorized, region-aware listings. |
| [src/app/discovery.css](../src/app/discovery.css) | Subtitle editorial facts layout and incremental-results spacing. |
| [src/app/movies/[id]/page.tsx](../src/app/movies/[id]/page.tsx) | Available subtitle languages and movie-specific, local-time theater discovery. |
| [src/app/movies/page.tsx](../src/app/movies/page.tsx) | Server-rendered first page/cursor and search-state reset on navigation. |
| [src/app/page.tsx](../src/app/page.tsx) | Shared availability/status logic and refreshed public viewer counts. |
| [src/app/watch/[id]/page.tsx](../src/app/watch/[id]/page.tsx) | Authorized multi-language subtitle assets in the personal player. |
| [src/components/admin-catalog-form.tsx](../src/components/admin-catalog-form.tsx) | Subtitle configuration and explicit replacement controls. |
| [src/components/cinema-player.tsx](../src/components/cinema-player.tsx) | Language selection, measured controls, hide/show, gesture activation and interrupted-load recovery. |
| [src/components/create-room-form.tsx](../src/components/create-room-form.tsx) | Explain administrator-managed public screenings and retain free private setup. |
| [src/components/glass.tsx](../src/components/glass.tsx) | Expose the player-control element for responsive measurement. |
| [src/components/movie-search.tsx](../src/components/movie-search.tsx) | Incremental loading, cancellation, empty/errors and initial-page race correction. |
| [src/components/room-client.tsx](../src/components/room-client.tsx) | Capabilities, retry keys, message deletion, invitations/Start Watching and rejoin denial handling. |
| [src/components/solo-player.tsx](../src/components/solo-player.tsx) | Reuse the player media type with supported subtitle tracks. |
| [src/components/theater-lobby.tsx](../src/components/theater-lobby.tsx) | Crisp posters, status/genre/runtime, local times and disabled unavailable/ended entry. |
| [src/components/theater-reactions.tsx](../src/components/theater-reactions.tsx) | Personal hide/show action for floating reactions. |
| [src/lib/catalog-pagination.ts](../src/lib/catalog-pagination.ts) | Bounded opaque cursor validation and timestamp/ID positions. |
| [src/lib/events.ts](../src/lib/events.ts) | Private deletion notifications and shared presence lease duration. |
| [src/lib/live.ts](../src/lib/live.ts) | Current public administrator controls, audit, retry-safe private messages/deletion. |
| [src/lib/media.ts](../src/lib/media.ts) | Approved subtitle assets and label-only public metadata. |
| [src/lib/presence.ts](../src/lib/presence.ts) | Reuse the shared public-seat/presence lease duration. |
| [src/lib/providers.ts](../src/lib/providers.ts) | Stable paginated catalog queries and subtitle-aware metadata loading. |
| [src/lib/realtime-audience.ts](../src/lib/realtime-audience.ts) | Exclude expired public seats during fresh batched authorization. |
| [src/lib/room-delivery-queue.ts](../src/lib/room-delivery-queue.ts) | Bound work per room/worker and recover overload from authoritative snapshots. |
| [src/lib/rooms.ts](../src/lib/rooms.ts) | Public creation policy, leased capacity, permissions, private snapshots and subtitle delivery. |
| [src/lib/seat-lease.ts](../src/lib/seat-lease.ts) | Shared public reservation expiry and cutoff calculations. |
| [src/lib/seat-renewal.ts](../src/lib/seat-renewal.ts) | Batch renewals serialized with public capacity reservations. |
| [src/lib/theater-policy.ts](../src/lib/theater-policy.ts) | Public administrator/private host permissions and screening states. |
| [src/lib/theaters.ts](../src/lib/theaters.ts) | Membership-filtered discovery with availability, metadata and state. |
| [src/lib/validation.ts](../src/lib/validation.ts) | UUID message retries, deletion identifiers and subtitle language/URL bounds. |
| [tests/e2e/catalog-pagination.spec.ts](../tests/e2e/catalog-pagination.spec.ts) | Incremental pages, tied timestamps, empty/error recovery and cursor limits. |
| [tests/e2e/catalog-rights.spec.ts](../tests/e2e/catalog-rights.spec.ts) | Real administrator form, subtitle persistence/constraints, preserved tracks and rejected unsafe rights updates. |
| [tests/e2e/delayed-sync.spec.ts](../tests/e2e/delayed-sync.spec.ts) | Two real browsers with latency, clock skew, out-of-order revisions and reconnect recovery. |
| [tests/e2e/design.spec.ts](../tests/e2e/design.spec.ts) | Preserve theme/layout/accessibility checks with explicit admin fixtures and actual catalog expectations. |
| [tests/e2e/helpers.ts](../tests/e2e/helpers.ts) | Optional fixture-only administrator assignment; ordinary test accounts remain ordinary. |
| [tests/e2e/player-recovery.spec.ts](../tests/e2e/player-recovery.spec.ts) | Actual language/quality switches, hide/show, autoplay and AbortError recovery. |
| [tests/e2e/private-messages.spec.ts](../tests/e2e/private-messages.spec.ts) | Authorization, concurrency/retry, own/host deletion, interrupted publication, clipboard and removal. |
| [tests/e2e/public-policy.spec.ts](../tests/e2e/public-policy.spec.ts) | Fresh administrator roles, stale commands, screening states and hidden reactions. |
| [tests/e2e/public-seats.spec.ts](../tests/e2e/public-seats.spec.ts) | Expired capacity, returning-viewer races, lock-delayed renewal and preserved private grants. |
| [tests/e2e/scaling.spec.ts](../tests/e2e/scaling.spec.ts) | Use an administrator fixture while preserving the 100-viewer/two-worker workload. |
| [tests/e2e/security.spec.ts](../tests/e2e/security.spec.ts) | Preserve permission/moderation checks with an authorized public-screening fixture. |
| [tests/e2e/theaters.spec.ts](../tests/e2e/theaters.spec.ts) | Retain public emoji-only/private-chat flows and verify public deletion rejection. |
| [tests/e2e/worldwide.spec.ts](../tests/e2e/worldwide.spec.ts) | Administrator premiere fixture and correctly labelled upcoming state. |
| [tests/mobile/theaters.spec.ts](../tests/mobile/theaters.spec.ts) | Two-context real media/chat/reactions, themes, orientations, fullscreen and spacing in both emulated engines. |
| [tests/unit/catalog-pagination.test.ts](../tests/unit/catalog-pagination.test.ts) | Cursor tie-breakers and malformed/oversized cursor rejection. |
| [tests/unit/media.test.ts](../tests/unit/media.test.ts) | Legacy/multiple captions, approved-host/rights filtering and URL-free metadata. |
| [tests/unit/room-delivery-queue.test.ts](../tests/unit/room-delivery-queue.test.ts) | Delivery ordering, bounded overflow/concurrency and failure recovery. |
| [tests/unit/theater-policy.test.ts](../tests/unit/theater-policy.test.ts) | Public/private permission boundaries and ended/unavailable state precedence. |
