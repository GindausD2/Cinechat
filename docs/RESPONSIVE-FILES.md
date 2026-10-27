# Finishing, responsive and adaptive changed files

Repository: **GindausD2/Cinechat**. Paths below are relative to completed baseline `802714cb60dc04d62bc55ba36a17b8721338e9c6`; they include the preserved finishing draft and this responsive change. Earlier V1 and trust work is recorded separately in [V1-FILES.md](V1-FILES.md) and [TRUST-FILES.md](TRUST-FILES.md).

No framework/database/authentication replacement, public text chat, payment flow, merge or deployment is included. Generated builds, private environments, browser binaries and raw traces are not committed.

| Exact path | Change |
| --- | --- |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Install Firefox and run the three-engine responsive suite in existing CI. |
| [`README.md`](../README.md) | Local setup, responsive/finishing reports, features and test commands. |
| [`docs/ADAPTIVE.md`](../docs/ADAPTIVE.md) | Foldable audit, optional segment APIs, inline chat, focus correction and hardware limitations. |
| [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) | Current verification links and correct non-executable billing archive path. |
| [`docs/RESPONSIVE-FILES.md`](../docs/RESPONSIVE-FILES.md) | This exact path inventory relative to the last completed commit. |
| [`docs/RESPONSIVE.md`](../docs/RESPONSIVE.md) | Audit, implementation, commands, browser evidence and device limitations. |
| [`docs/THIRD-PARTY-AUDIT.md`](../docs/THIRD-PARTY-AUDIT.md) | New address-parser advisories, focused mailer patch and updated audit snapshot. |
| [`docs/V1-FINISHING.md`](../docs/V1-FINISHING.md) | Saved finishing gaps, implementation, additive migration, validation and launch boundaries. |
| [`docs/responsive-release/README.md`](../docs/responsive-release/README.md) | Screenshot index, test-data disclosure and film/asset attribution. |
| [`docs/responsive-release/deletion-large-text-mobile-dark.png`](../docs/responsive-release/deletion-large-text-mobile-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/dual-screen-private-dark.png`](../docs/responsive-release/dual-screen-private-dark.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/dual-screen-public-dark.png`](../docs/responsive-release/dual-screen-public-dark.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/home-desktop-dark.png`](../docs/responsive-release/home-desktop-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/home-desktop-light.png`](../docs/responsive-release/home-desktop-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/home-mobile-dark.png`](../docs/responsive-release/home-mobile-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/home-mobile-light.png`](../docs/responsive-release/home-mobile-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/invitation-mobile-dark.png`](../docs/responsive-release/invitation-mobile-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/matrix-summary.json`](../docs/responsive-release/matrix-summary.json) | Machine-readable verified layout counts and browser matrix summary. |
| [`docs/responsive-release/private-chat-phone-dark.png`](../docs/responsive-release/private-chat-phone-dark.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/private-chat-phone-light.png`](../docs/responsive-release/private-chat-phone-light.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/private-desktop-dark.png`](../docs/responsive-release/private-desktop-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/private-desktop-light.png`](../docs/responsive-release/private-desktop-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/private-folded-phone-dark.png`](../docs/responsive-release/private-folded-phone-dark.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/private-keyboard-height-dark.png`](../docs/responsive-release/private-keyboard-height-dark.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/private-mobile-dark.png`](../docs/responsive-release/private-mobile-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/private-mobile-light.png`](../docs/responsive-release/private-mobile-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/private-tablet-light.png`](../docs/responsive-release/private-tablet-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/private-unfolded-dark.png`](../docs/responsive-release/private-unfolded-dark.png) | Unedited browser capture; viewport, theme, simulation and licensing are documented in the capture index. |
| [`docs/responsive-release/private-waiting-mobile-light.png`](../docs/responsive-release/private-waiting-mobile-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/public-desktop-dark.png`](../docs/responsive-release/public-desktop-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/public-desktop-light.png`](../docs/responsive-release/public-desktop-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/public-mobile-dark.png`](../docs/responsive-release/public-mobile-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/public-mobile-light.png`](../docs/responsive-release/public-mobile-light.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`docs/responsive-release/public-waiting-mobile-dark.png`](../docs/responsive-release/public-waiting-mobile-dark.png) | Unedited, individually inspected browser screenshot; dimensions/theme are listed in the capture index. |
| [`package-lock.json`](../package-lock.json) | Resolve both affected Nodemailer copies to 10.1.4. |
| [`package.json`](../package.json) | Responsive test script and focused patched mailer dependency/override. |
| [`playwright.responsive.config.ts`](../playwright.responsive.config.ts) | Three-engine production browser matrix, reports and optional local executable paths. |
| [`prisma/migrations/20261024000100_reminder_delivery_index/migration.sql`](../prisma/migrations/20261024000100_reminder_delivery_index/migration.sql) | Add ScreeningReminder(sentAt, roomId); no row deletion or replacement. |
| [`prisma/schema.prisma`](../prisma/schema.prisma) | Index pending screening-reminder delivery. |
| [`src/app/adaptive.css`](../src/app/adaptive.css) | Container-based theater/discovery layout, compact inline chat, optional hinge-safe panes and safe dialogs/navigation. |
| [`src/app/admin/page.tsx`](../src/app/admin/page.tsx) | Named keyboard-scroll regions around administrator tables. |
| [`src/app/api/reminders/route.ts`](../src/app/api/reminders/route.ts) | Read persisted preferences; validate authenticated reminder changes. |
| [`src/app/cinema.css`](../src/app/cinema.css) | Scalable theater/player typography, explicit state selectors and waiting-room layout. |
| [`src/app/community.css`](../src/app/community.css) | Scale community UI typography with user text preferences. |
| [`src/app/discovery.css`](../src/app/discovery.css) | Scalable discovery typography and history/completion presentation. |
| [`src/app/globals.css`](../src/app/globals.css) | Scalable shared typography and natural-height navigation. |
| [`src/app/history/loading.tsx`](../src/app/history/loading.tsx) | History loading state. |
| [`src/app/history/page.tsx`](../src/app/history/page.tsx) | Owner-only recent viewing history, continuation and completed-film replay. |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Preserve server authentication and page children inside the stable optional viewport wrapper; import responsive styles. |
| [`src/app/legal/cookies/page.tsx`](../src/app/legal/cookies/page.tsx) | Named keyboard-scroll regions around storage-policy tables. |
| [`src/app/page.tsx`](../src/app/page.tsx) | Upcoming countdowns, Recently watched and full-history entry. |
| [`src/app/responsive.css`](../src/app/responsive.css) | Contained reflow, safe areas, tablet/phone navigation, forms, small-player settings and visible cross-engine range controls. |
| [`src/app/watch/[id]/page.tsx`](../src/app/watch/[id]/page.tsx) | Key the solo player by movie so its local state does not leak between films. |
| [`src/app/watchlist/page.tsx`](../src/app/watchlist/page.tsx) | Link authenticated viewers to their viewing history. |
| [`src/components/cinema-player.tsx`](../src/components/cinema-player.tsx) | Lazy/native HLS, compact settings, recovery/loading state, focus-safe fullscreen, progress flushing and range progress styling. |
| [`src/components/movie-card.tsx`](../src/components/movie-card.tsx) | History cards distinguish continuation, completion and watch date. |
| [`src/components/navbar.tsx`](../src/components/navbar.tsx) | Measured navigation/viewport spacing and composer focus correction around the pinned film, navigation and keyboard. |
| [`src/components/reminder-button.tsx`](../src/components/reminder-button.tsx) | Fetch/persist visible reminder state with loading, retry and cancellation. |
| [`src/components/room-client.tsx`](../src/components/room-client.tsx) | Inline film/chat structure, contained message scrolling, retained drafts and server-clock waiting rooms. |
| [`src/components/screening-countdown.tsx`](../src/components/screening-countdown.tsx) | Accessible passive countdown and monotonic server-sampled clock. |
| [`src/components/scroll-region.tsx`](../src/components/scroll-region.tsx) | Named keyboard-focusable scrolling regions, including a private live-message log. |
| [`src/components/theater-lobby.tsx`](../src/components/theater-lobby.tsx) | Upcoming countdowns and explicit screening-grid state. |
| [`src/components/theater-reactions.tsx`](../src/components/theater-reactions.tsx) | Reveal clipped reaction buttons on keyboard focus by scrolling only their tray. |
| [`src/components/viewport-layout.tsx`](../src/components/viewport-layout.tsx) | Feature-detect measured browser segments; update CSS without replacing video or room state. |
| [`src/lib/countdown.ts`](../src/lib/countdown.ts) | Validated countdown formatting using an explicit server clock. |
| [`src/lib/reminders.ts`](../src/lib/reminders.ts) | Fresh grant/block/ban checks, safe owned cancellation and bounded atomic delivery. |
| [`src/lib/rooms.ts`](../src/lib/rooms.ts) | Include the authorized movie backdrop in member snapshots. |
| [`src/lib/theaters.ts`](../src/lib/theaters.ts) | Return server time with theater listings. |
| [`src/lib/viewport-layout.ts`](../src/lib/viewport-layout.ts) | Validate segment geometry and select comfortable columns or one safe pane. |
| [`tests/e2e/design.spec.ts`](../tests/e2e/design.spec.ts) | Verify keyboard-reachable, contained reaction scrolling without shrinking phone touch targets. |
| [`tests/e2e/finishing.spec.ts`](../tests/e2e/finishing.spec.ts) | Regression for reminder delivery after private invitation expiration. |
| [`tests/responsive/foldable.spec.ts`](../tests/responsive/foldable.spec.ts) | Two viewers, active playback, drafts, socket/video identity, composer visibility and native hinge simulation. |
| [`tests/responsive/layouts.spec.ts`](../tests/responsive/layouts.spec.ts) | Actual authenticated page/theater/waiting matrices, long text, two viewers, captions, focus, history and reminders. |
| [`tests/unit/countdown.test.ts`](../tests/unit/countdown.test.ts) | Clock-independent countdown, long durations and invalid input cases. |
| [`tests/unit/viewport-layout.test.ts`](../tests/unit/viewport-layout.test.ts) | Nine fallback, hinge, malformed geometry, safe-area and keyboard-occlusion cases. |

Total: 75 paths. Apply the single new additive reminder index with `npm run db:migrate`; foldable layouts require no new database model or runtime environment key. See [RESPONSIVE.md](RESPONSIVE.md), [ADAPTIVE.md](ADAPTIVE.md) and [the capture index](responsive-release/README.md) for evidence and limits.
