# Responsive and browser compatibility — 24 October 2026

Scope: GindausD2/Cinechat. Preserve the existing cinematic identity, public emoji-only theaters, private chat/invitations, authentication, database and authoritative playback. No merge, deployment, payments or unrelated-project changes.

## Audit and plan

- [x] Inspect existing styles, navigation, player, chat, forms, image sizing, breakpoints and browser tests. Preserve the saved finishing work from the interrupted session.
- [x] Stabilize current code checks. The saved player work triggered a React lint error on imperative caption-track mutation; moved that DOM operation into an explicit helper. Lint, TypeScript, 40 unit tests and production build then passed.
- [x] Run a browser baseline across 28 page families, eleven widths and both themes; test public/private HLS layouts separately. This exposed 92 overflowing page states and 12 overflowing theater states using valid long user-entered values.
- [x] Fix shared shrinking/wrapping, phone/tablet navigation, safe areas, scalable typography and keyboard-height forms.
- [x] Keep small-player controls and captions accessible, preserve fullscreen/synchronization and verify private chat independently.
- [x] Verify Chromium, WebKit and Firefox matrices, enlarged text, orientation, dialogs, screenshots and existing full-flow suites.
- [x] Record final files, checks, retained features and actual device/browser limitations.

## Baseline findings

Settings overflowed at 320–360px. Long biographies, club titles/descriptions and notification text expanded the page even on larger screens. Long theater names overflowed at 768–1280px. These are reproducible test inputs within the application field limits, not fabricated production activity. Poster rails and administrator/policy tables intentionally scroll inside their own containers and are excluded from document-overflow failures.

Baseline player geometry kept reactions separated from playback controls. Further checks cover touch targets, HLS quality/subtitles, fullscreen fallback focus, keyboard-height forms and text enlargement rather than assuming that absence of page overflow establishes usability.

See [ADAPTIVE.md](ADAPTIVE.md) for the subsequent foldable/dual-screen audit, stable player identity, inline chat scrolling and optional hinge support.

## Validation scope

Viewport matrix: 320, 360, 375, 390, 430, 600, 768, 1024, 1280, 1440, 1920, 2560 and 3440 CSS pixels, in dark and light themes. The baseline audit used the first eleven widths; the final suite adds ultrawide coverage. Separate orientation checks cover phone/tablet landscape; text scaling and constrained-height forms are tested explicitly. Browser tests use the actual app, authenticated accounts, PostgreSQL, Redis, two realtime workers and legally usable Blender sample media.

Chromium/WebKit/Firefox run on Linux in this execution environment. Device profiles and viewport changes emulate layouts; they are not physical iPhone, iPad, Android, foldable, Windows, macOS, ChromeOS, Safari or Microsoft Edge certification. Physical keyboards, OS text-size settings, accessibility tools and actual mobile keyboards still require manual checks. Record verified engines/results below after tests run.

## Implemented changes

- Shared grid/flex children can shrink; long biographies, usernames, club copy, notifications, theater names and buttons wrap inside the page. Poster rails and tables retain contained scrolling. Administrator and cookie tables now have named, keyboard-focusable scrolling regions.
- Navigation reserves its measured height, includes notch/home-indicator insets, and uses two rows on tablets. Phone navigation is hidden while an editing field has a constrained visual viewport; the focused field scrolls into view. Fields use at least 16px default text on phones/coarse pointers. Viewport configuration allows user zoom.
- UI typography uses `rem` units so text enlargement causes reflow. Wordmark and emoji artwork stay bounded. Both original black/blue and white/blue themes, local fonts, image-consent behavior and design tokens are preserved.
- Small portrait players retain a 16:9 contained picture with reaction/control strips below it. Wider players retain overlays; the measured control height keeps reactions clear. Playback targets are at least 44px, including the seek/volume hit areas. Explicit range tracks and thumbs keep seek/volume visible in WebKit as well as Chromium/Firefox. Narrow containers use a playback-settings dialog for captions/quality; desktop selectors remain available.
- Private chat remains an inline, optionally collapsible panel below video and film information on phones and smaller tablets, and sits beside it when the container can accommodate a useful player and chat. Incoming messages scroll only the message pane. Resizing retains the same video, connection, messages and draft. Messages and participant names wrap; moderation controls remain touchable. Public theaters never render chat. Existing HTTP/WebSocket public-message rejection is unchanged.
- Standard container fullscreen is attempted first on unsegmented displays. Supported segmented displays use the safe-pane immersive fallback. The immersive CSS fallback now traps focus, makes outside content inert, supports Escape, and restores focus/scroll state. Nested playback-settings dialogs retain their own focus behavior.
- HLS playback dynamically imports Hls.js on compatible MediaSource browsers to preserve manual rendition selection. Native-only browsers avoid that import; native HLS remains a fallback when MediaSource playback is unsupported. MP4 does not initialize the library. Bounded HLS recovery owns its error state, and a successfully recovered source clears obsolete playback errors. Paused metadata-only loading no longer leaves a spinner visible indefinitely.
- Existing responsive `next/image` sizing, poster aspect ratios, lazy image loading, local fonts, reduced-motion support, authorized media boundaries and server-authoritative playback are retained. No new runtime dependency or tracking was introduced. No network-performance or Core Web Vitals improvement is claimed without measurement.

The saved V1 finishing work is connected and verified alongside these changes: server-clock waiting rooms, persisted/authorized screening reminders, final progress flushing and owner-only viewing history. See [V1-FINISHING.md](V1-FINISHING.md). A fresh dependency audit also prompted a focused Nodemailer patch; details are in [THIRD-PARTY-AUDIT.md](THIRD-PARTY-AUDIT.md).

## Reproduce

Use Node 24 and local fixture infrastructure only. Follow [README.md](../README.md) for setup, migration, seed and licensed sample download, then:

```sh
npm run media:hls-fixture
npx playwright install --with-deps chromium webkit firefox
npm run check
E2E_PRODUCTION=true npm run test:e2e
E2E_PRODUCTION=true npm run test:mobile
E2E_PRODUCTION=true npm run test:responsive
npm audit
```

Run the browser commands sequentially: they share ports and the compiled production build. The fixtures use PostgreSQL, Redis, two realtime workers, loopback SMTP and the separate licensed media service. Accounts, valid maximum-length text and notifications are synthetic test data. Tests do not contact production users or deploy the app. Repeated local signup runs can reach the real registration limit; application limits are not disabled by the suite.

`playwright.responsive.config.ts` permits optional `E2E_WEBKIT_EXECUTABLE` and `E2E_FIREFOX_EXECUTABLE` paths for a preinstalled local browser. This managed Linux workspace needed private writable browser/cache directories, WebKit's GStreamer temporary cache and reviewed execution permission for Firefox's own process sandbox. Browser sandboxing and TLS verification were not disabled. Standard CI uses Playwright's installed browsers and system dependencies.

## Evidence and remaining limitations

Final command results, inspected screenshots and the exact path inventory are recorded below after the release checks complete. Historical failed diagnostic runs remain distinct from the final results: the initial overflow matrix, paused metadata loading, an HLS error overlay, a native-HLS preference that removed available manual quality controls, and one reset idle HTTP connection during test-room ending. Manual rendition selection was restored on compatible MediaSource browsers. The connection-reset case is handled with bounded transport retries plus an explicit PostgreSQL ended-state assertion; HTTP authorization failures are not retried as successes. The earlier design assertion that all seven reactions fit without contained scrolling was updated to verify keyboard reachability and 44px targets in the swipeable phone tray.

The responsive suite checks 28 route families × 13 widths × 2 themes; two live theater layouts × 13 widths × 2 themes; two waiting rooms at the same widths/themes; and nine routes at 200% CSS text across 320/768/1280px. Additional checks cover 320px invitations/deletion/settings dialogs, keyboard focus/scrolling, a constrained 390×400 form, and 568×320, 844×390 and 1024×768 fullscreen fallback. Separate Android/iPhone emulation checks portrait and landscape with two authenticated viewers.

This is representative compatibility evidence, not universal device certification. Actual iOS/iPadOS Safari, Android Chrome, macOS Safari, Windows Chrome/Edge, ChromeOS, physical foldable hinges, OS keyboards/safe areas, pinch zoom, OS dynamic text, screen readers and native mobile video-only fullscreen still need manual checks. Background playback and picture-in-picture are not promised. In browsers without container fullscreen, the in-page immersive fallback retains the CineChat controls and reactions. Minimum versions listed by Next.js/Tailwind are framework targets, not versions individually tested here; older unsupported browser/OS combinations are outside this verification.

Hosted preview/launch still requires verified HTTPS/WSS infrastructure, real transactional mail, approved media/CDN/CORS behavior and rights, business/contact disclosures and legal/child-safety review. `npm run check:production` deliberately fails for the local sample configuration. No merge or deployment was performed.

## Verified responsive checkpoint — 26 October 2026

Before the later champagne-gold/movie-journey request, lint, TypeScript, 49 unit tests and the production build passed. The full application acceptance run passed 31 cases (8.1 minutes); affected mobile emulation reruns passed both cases (2.4 minutes). The final responsive run passed 16 cases with two expected native-CDP skips (11.7 minutes). Chromium 156.0.8078.4, WPE WebKit 27.2 and Firefox 157.0 each checked 886 layout states with zero document-overflow findings, plus 13 same-session viewport transitions. Chromium also verified actual emulated viewport segments and two-viewer active playback recovery after folding.

All 24 saved images were opened individually for visual review. They document this checkpoint's black/white-and-blue appearance; the subsequent movie-watching work changes that palette to champagne gold. [Machine-readable results](responsive-release/matrix-summary.json), [captures](responsive-release/README.md) and [exact 75-path inventory](RESPONSIVE-FILES.md) distinguish this verified checkpoint from later changes.

Eleven migrations are up to date and the read-only Prisma comparison reports no schema drift. The full dependency audit reports zero known vulnerabilities. Production preflight remains intentionally blocked by local-only origins/media/mail and missing verified operator/contact/launch-country disclosures. No merge or deployment occurred.
