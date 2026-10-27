# CineChat premium redesign

> Historical baseline report. The current free-theater behavior and verification
> supersede this snapshot: [FREE-THEATERS.md](FREE-THEATERS.md).

Repository: **GindausD2/Cinechat**. This update builds on V1 commit
`07cd8f7f15e31cf2cc27b07bfc933bb07a4bbf41` and preserves the existing backend.

## Implemented

- An original blue CineChat identity, Inter UI text, and restrained Montserrat headings.
- Black/charcoal dark mode and white/soft-gray light mode, with shared semantic tokens.
  Light-mode cinema artwork is framed; surrounding content uses bright editorial surfaces.
- Dark, Light, and System appearance choices, saved in local storage, synchronized
  across tabs, updated when system appearance changes, and applied before hydration.
- Professional desktop navigation and a compact mobile header with accessible
  search, notifications, appearance, profile, and fixed bottom navigation.
- Licensed photographic movie posters and stills, minimal corners, clear metadata,
  horizontal poster rails, landscape popular-film collections, genre links, and
  actual continue-watching progress. Recommendations, schedules, clubs, and live
  counts continue to use PostgreSQL/Redis data.
- Immersive movie detail pages with cast/creators, genres, duration, year, trailers,
  My List actions, related films, and public screening discovery. Private rooms are
  excluded from this public movie section; authorized members retain lobby access.
- A player-focused screening room with readable chat, viewer controls, reactions,
  invites, collapsible chat, and subtle glass controls. Host synchronization,
  membership, blocking, reporting, moderation, and playback rights are preserved.
- Theme-aware authentication, settings, profiles, clubs, notifications, billing,
  administration, dialogs, and legal pages through the shared tokens.
- Visible focus states, keyboard-operable theme selection, native labeled dialogs,
  reduced-motion support, safe-area mobile navigation, and larger touch controls.

Glass is limited to navigation, menus, dialogs, player controls, and chat overlays.
Movie and editorial cards use crisp imagery and solid surfaces. On light-gray
surfaces, secondary text uses `#5E6D83` to meet contrast requirements; primary
secondary text remains `#64748B`. Dark blue hover fills use a dark foreground for
readable contrast.

## Preserved integrations and data

Auth.js, PostgreSQL/Prisma, Redis, WebSockets, room authorization, authoritative
playback, social APIs, and payment restrictions are unchanged. Existing catalog
records and custom administrator artwork stay intact. The original seeded SVG
paths resolve to the licensed upgraded assets at display time. Film attribution
is separated from the retired poster-composition credit; custom credits stay intact.

**No schema changes or new migrations.** Both existing migrations remain applied:
`20261014085726_foundation` and `20261014094000_safety_constraints`.
`prisma migrate status` reports the database is up to date.

## Verification

| Check | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed; production build also runs TypeScript |
| Vitest | 21 tests passed in 9 files |
| Optimized Next.js production build | Passed |
| Playwright against the production build | 8 tests passed |
| Automated WCAG A/AA checks | No violations in 12 homepage/detail/room theme-and-size captures |
| Responsive page overflow | Passed at widths 320, 360, 390, 768, 1024, and 1440 |
| npm audit, including development dependencies | Zero advisories |
| Database migration status | Up to date; 2 existing migrations |

Browser tests cover actual registration, SMTP verification/reset, login, search,
My List, private invitations and codes, two-viewer playback drift, host pause/play,
chat, emoji reactions, leave/rejoin, reconnection, quotas, moderation, blocking,
clubs, notifications, reminders, account deletion, private access, and admin denial.
Theme tests verify system changes, reload persistence, cross-tab updates, keyboard
operation, genre filtering, chat collapse, viewers, and public-party discovery.

Production-mode browser tests configure a loopback-only SMTP receiver for
synthetic `example.com`/`example.test` addresses. It never forwards mail, writes
private test receipts to the ignored `.data/outbox`, and leaves the application's
production outbox prohibition intact. No real email or payment was sent.

## Screenshots and visual review

Playwright captured the homepage, movie details, and screening room in dark/light
mode at 1440×1000 and 390×844. The captures were opened and visually inspected for
artwork cropping, type, spacing, contrast, navigation, and player/chat placement.
The mobile play-button overlap and light-surface contrast issues found during
review were corrected. All original full-page and viewport captures are generated
in `test-results/redesign/`; CI retains these and its browser report for seven days.
Representative captures are committed below. These are Chromium viewport checks;
physical iOS/Android devices and native Safari/Firefox were not tested.

| Page | Desktop dark | Desktop light | Mobile dark | Mobile light |
| --- | --- | --- | --- | --- |
| Home | [View](redesign/screenshots/home-desktop-dark-viewport.png) | [View](redesign/screenshots/home-desktop-light-viewport.png) | [View](redesign/screenshots/home-mobile-dark-viewport.png) | [View](redesign/screenshots/home-mobile-light-viewport.png) |
| Movie detail | [View](redesign/screenshots/movie-desktop-dark-viewport.png) | [View](redesign/screenshots/movie-desktop-light-viewport.png) | [View](redesign/screenshots/movie-mobile-dark-viewport.png) | [View](redesign/screenshots/movie-mobile-light-viewport.png) |
| Cinema room | [View](redesign/screenshots/room-desktop-dark-viewport.png) | [View](redesign/screenshots/room-desktop-light-viewport.png) | [View](redesign/screenshots/room-mobile-dark-viewport.png) | [View](redesign/screenshots/room-mobile-light-viewport.png) |

Full mobile chat layouts: [dark](redesign/screenshots/room-mobile-dark.png),
[light](redesign/screenshots/room-mobile-light.png). Account names and room data in
captures are local test fixtures.

## Artwork and launch requirements

The 10 optimized WebP assets include licensed Blender film posters and stills.
Per-file authors, upstream URLs, license versions, and resizing notes are recorded
in [the asset manifest](../public/art/films/licenses.json) and shown at `/legal#artwork`.
Displaying artwork does not expand playback rights. Unlicensed/unconfigured titles
remain discovery-only. FrameXTV remains disabled pending contract and rights review.

No new operator credentials are needed for the redesign. Google OAuth, real SMTP,
managed PostgreSQL/Redis, object storage/CDN, and Stripe still require launch
configuration and provider smoke tests described in [DEPLOYMENT.md](DEPLOYMENT.md).
Commercial film distribution needs licenses. Live charges remain disabled, and
this change has not been publicly deployed.

Run an existing local setup with `npm ci` then `npm run dev`. Fresh installation,
database/media setup, and verification commands are in [README.md](../README.md).
Run production browser verification after `npm run build` with:

```sh
E2E_PRODUCTION=true npm run test:e2e
```

## Changed files

61 files changed relative to the V1 base, including artwork, design captures, and documentation.

- [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [README.md](../README.md)
- [docs/DELIVERY.md](../docs/DELIVERY.md)
- [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md)
- [docs/REDESIGN.md](../docs/REDESIGN.md)
- [docs/redesign/screenshots/home-desktop-dark-viewport.png](../docs/redesign/screenshots/home-desktop-dark-viewport.png)
- [docs/redesign/screenshots/home-desktop-light-viewport.png](../docs/redesign/screenshots/home-desktop-light-viewport.png)
- [docs/redesign/screenshots/home-mobile-dark-viewport.png](../docs/redesign/screenshots/home-mobile-dark-viewport.png)
- [docs/redesign/screenshots/home-mobile-light-viewport.png](../docs/redesign/screenshots/home-mobile-light-viewport.png)
- [docs/redesign/screenshots/movie-desktop-dark-viewport.png](../docs/redesign/screenshots/movie-desktop-dark-viewport.png)
- [docs/redesign/screenshots/movie-desktop-light-viewport.png](../docs/redesign/screenshots/movie-desktop-light-viewport.png)
- [docs/redesign/screenshots/movie-mobile-dark-viewport.png](../docs/redesign/screenshots/movie-mobile-dark-viewport.png)
- [docs/redesign/screenshots/movie-mobile-light-viewport.png](../docs/redesign/screenshots/movie-mobile-light-viewport.png)
- [docs/redesign/screenshots/room-desktop-dark-viewport.png](../docs/redesign/screenshots/room-desktop-dark-viewport.png)
- [docs/redesign/screenshots/room-desktop-light-viewport.png](../docs/redesign/screenshots/room-desktop-light-viewport.png)
- [docs/redesign/screenshots/room-mobile-dark-viewport.png](../docs/redesign/screenshots/room-mobile-dark-viewport.png)
- [docs/redesign/screenshots/room-mobile-dark.png](../docs/redesign/screenshots/room-mobile-dark.png)
- [docs/redesign/screenshots/room-mobile-light-viewport.png](../docs/redesign/screenshots/room-mobile-light-viewport.png)
- [docs/redesign/screenshots/room-mobile-light.png](../docs/redesign/screenshots/room-mobile-light.png)
- [next-env.d.ts](../next-env.d.ts)
- [next.config.ts](../next.config.ts)
- [package-lock.json](../package-lock.json)
- [package.json](../package.json)
- [playwright.config.ts](../playwright.config.ts)
- [public/art/films/bunny-poster.webp](../public/art/films/bunny-poster.webp)
- [public/art/films/bunny-still.webp](../public/art/films/bunny-still.webp)
- [public/art/films/caminandes-still.webp](../public/art/films/caminandes-still.webp)
- [public/art/films/cosmos-poster.webp](../public/art/films/cosmos-poster.webp)
- [public/art/films/elephants-poster.webp](../public/art/films/elephants-poster.webp)
- [public/art/films/elephants-still.webp](../public/art/films/elephants-still.webp)
- [public/art/films/licenses.json](../public/art/films/licenses.json)
- [public/art/films/sintel-poster.webp](../public/art/films/sintel-poster.webp)
- [public/art/films/sintel-still.webp](../public/art/films/sintel-still.webp)
- [public/art/films/steel-poster.webp](../public/art/films/steel-poster.webp)
- [public/art/films/steel-still.webp](../public/art/films/steel-still.webp)
- [src/app/cinema.css](../src/app/cinema.css)
- [src/app/cinemas/page.tsx](../src/app/cinemas/page.tsx)
- [src/app/community.css](../src/app/community.css)
- [src/app/discovery.css](../src/app/discovery.css)
- [src/app/globals.css](../src/app/globals.css)
- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/app/legal/page.tsx](../src/app/legal/page.tsx)
- [src/app/movies/[id]/page.tsx](../src/app/movies/[id]/page.tsx)
- [src/app/page.tsx](../src/app/page.tsx)
- [src/app/theme.css](../src/app/theme.css)
- [src/app/watch/[id]/page.tsx](../src/app/watch/[id]/page.tsx)
- [src/app/watchlist/page.tsx](../src/app/watchlist/page.tsx)
- [src/components/cinema-player.tsx](../src/components/cinema-player.tsx)
- [src/components/glass.tsx](../src/components/glass.tsx)
- [src/components/movie-card.tsx](../src/components/movie-card.tsx)
- [src/components/movie-search.tsx](../src/components/movie-search.tsx)
- [src/components/navbar.tsx](../src/components/navbar.tsx)
- [src/components/room-client.tsx](../src/components/room-client.tsx)
- [src/components/solo-player.tsx](../src/components/solo-player.tsx)
- [src/components/theme-switcher.tsx](../src/components/theme-switcher.tsx)
- [src/components/watchlist-button.tsx](../src/components/watchlist-button.tsx)
- [src/lib/artwork.ts](../src/lib/artwork.ts)
- [src/lib/theme.ts](../src/lib/theme.ts)
- [tests/e2e/acceptance.spec.ts](../tests/e2e/acceptance.spec.ts)
- [tests/e2e/design.spec.ts](../tests/e2e/design.spec.ts)
- [tests/support/mail-server.ts](../tests/support/mail-server.ts)
