# Movie journey, people and champagne-gold release

Audit: 26 October 2026, GindausD2/Cinechat. Baseline `c2cbdae` contains the verified responsive/theater work; its 24 blue-theme captures are historical evidence, not the new palette. No restart, database reset, payments, public chat, merge or deployment is part of this change.

## Findings and sequence

The existing Next.js/Auth.js/Prisma/PostgreSQL/Redis/Socket.IO application has real discovery, movie details, solo playback, public/private screenings, invitations, chat and authoritative playback. Poster cards already open details. Hero/continue links and the details Watch now action bypass theater selection. Credits are a legacy string array, without people or role relationships. The player has manual control hiding but no inactivity behavior. Inline private chat now survives resizing; unread indicators are missing.

- [x] Add backward-compatible people/credits and audio-language metadata; preserve legacy cast and existing movies/theaters.
- [x] Seed only sourced factual credits, short credited-work biographies and approved portrait licensing.
- [x] Add movie editorial details, clickable people profiles, filmography roles and related films.
- [x] Connect Watch now to public discovery, authorized private rooms and deliberate private creation; preserve direct screening/invitation context.
- [x] Apply the latest black/warm-white/champagne-gold tokens with accessible foregrounds.
- [x] Improve restrained controls, inactivity behavior and default subtitle positioning without remounting media.
- [x] Add private unread/jump-to-new controls while preserving inline chat, drafts, moderation and membership checks.
- [x] Verify complete navigation, authorization, two-viewer playback/chat, responsive and foldable regressions; record actual checks and screenshots.

## Metadata and image provenance

Curated facts are taken from official project credits, not fabricated film associations or scraped streaming services:

- [Big Buck Bunny core team](https://peach.blender.org/the-team/).
- [Sintel project](https://durian.blender.org/about/) and [official voice casting](https://durian.blender.org/news/casting-line-up-thom-hoffman-and-halina-reijn/).
- [Tears of Steel project credits](https://mango.blender.org/about/) and [cast roles](https://mango.blender.org/production/actor-line-up-movie-stars-derek-de-lint-sergio-hasselbaink-and-more/).
- [Elephants Dream annotated credits](https://orange.blender.org/theteam/).
- [Cosmos Laundromat team](https://gooseberry.blender.org/the-team/), [voice cast](https://gooseberry.blender.org/cosmos-laundromat-actor-lineup/) and [recording credits](https://gooseberry.blender.org/voice-acting-recording-the-film-set-way/).
- [Caminandes: Gran Dillama credits](https://studio.blender.org/projects/caminandes-2/pages/credits/).

Direct command-line requests to several project sites returned 403; their official pages were inspected through available web search/open results. Credit summaries are brief factual paraphrases, not copied biographies. Filmography is limited to verified CineChat catalog associations. Unknown audio languages remain explicitly unknown. Existing playable-source, age, region, validity and rights checks remain independent of metadata.

Ton Roosendaal's portrait is **William Maanders, 2008**, [CC BY 3.0 Netherlands](https://creativecommons.org/licenses/by/3.0/nl/deed.en), [file and attribution](https://commons.wikimedia.org/wiki/File:Ton_Roosendaal_2008.jpg). The original JPEG is retained unchanged (SHA-1 `38f307c4798aec2f11c0135fae510be682b6a8e3`). Other profiles use initials until a portrait with verified reuse terms is supplied. Portrait attribution must remain visible on the profile. Metadata permission does not grant streaming rights.

## Verification and launch boundaries

The 27 October local production-build check passes lint, TypeScript, 53 unit tests in 17 files, Prisma generation and the Next.js build. All 12 migrations are applied locally; Prisma's database-to-schema diff reports no difference. The dependency audit reports zero known vulnerabilities at this check. Final browser regression results are recorded below.

Physical phones, OS keyboards, native mobile fullscreen and physical foldables remain external testing requirements. Hosted mail, HTTPS/WSS infrastructure, approved media delivery, operator disclosures and legal/child-safety review remain launch dependencies. This technical work does not guarantee legal compliance.

## What changed and what is preserved

Movie cards, the homepage hero and viewing history lead to film details. The details page adds the poster, backdrop, directors, credited people, audio-language status and supplied subtitles. Watch now opens a read-only theater chooser: public screenings, private rooms the account is currently entitled to enter, deliberate private creation, and the preserved solo player. Refreshing the chooser never creates a theater. A valid `room` context returns to that screening; existing public-screening and invitation entry links continue directly to the existing access checks.

People profiles contain sourced names, professions, brief credited-work biographies, roles, filmography and separately labeled related films. The seed adds **36 people and 48 credits** across the six existing Blender films. It does not claim a comprehensive cast database. Only Ton Roosendaal currently has an approved photograph; other profiles use initials. Audio languages remain unknown unless sourced (English for Tears of Steel). The legacy cast column is retained, and existing people/credit records are not overwritten by their new seed operations. Existing catalog seeding behavior is preserved. No metadata SDK, tracking SDK or runtime provider key was introduced.

Player overlays now hide after three inactive seconds while playing; pointer activity or keyboard focus restores them. In-flow phone controls stay visible below the picture. Automatically positioned WebVTT cues reserve room above visible overlays; authored subtitle positions remain intact. Caption-load and cue-change listeners handle tracks that load after the initial language selection. Media initialization still depends on source/format/recovery revision, not chat, theme, viewport or control visibility.

Private chat gains bounded deduplication, unread badges and a jump-to-new action. Messages arriving while someone reads older messages do not move the whole page. The existing phone layout keeps player, film information and chat in that order, with the existing keyboard-aware composer. Chat drafts and video identity survive resizing. Server authorization, invitation expiry/revocation, private history, moderation and public emoji-only restrictions are reused. The rapid leave/rejoin page now rechecks a fresh membership grant before offering its existing join action when membership changes during server rendering.

The new palette is black/ivory/champagne in dark mode and warm white/charcoal/champagne in light mode. Primary-action foregrounds use explicit contrast tokens. Cast rails reveal partially clipped focused cards by scrolling only their own horizontal region; keyboard focus does not require a mouse or move the whole page.

## Database and running locally

The additive migration `prisma/migrations/20261026000100_verified_movie_credits/migration.sql` adds `Person`, `MovieCredit` and optional audio-language metadata. It adds source/verification fields, foreign keys, unique movie/person/job credits, lookup indexes and a constraint requiring portrait licensing/attribution/source whenever a portrait is stored. It does not drop movie, room or user records. The previous checkpoint's additive migration `20261024000100_reminder_delivery_index` remains required.

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

Use Node 24 and PostgreSQL/Redis from the existing Docker Compose configuration. The new work requires **no additional environment variables**. See [deployment configuration](DEPLOYMENT.md), `.env.example` and the main README for the existing authentication, email, realtime and storage configuration. Run `npm run media:hls-fixture` with FFmpeg before the HLS browser suites. Browser tests use isolated synthetic accounts and legally reusable Blender media.

The production-readiness check deliberately rejects this local configuration: it requires real SMTP, HTTPS web and realtime origins, disabled local-media/development-mail switches, verified operator/support/privacy/copyright contacts and founder-selected launch countries. Commercial distribution rights, approved portraits, translated subtitle tracks and target-device testing require separate evidence. No merge or deployment has been performed.

## Reproducible verification commands

```sh
npm run check
npx prisma migrate status
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
npm audit
E2E_PRODUCTION=true npm run test:e2e
E2E_PRODUCTION=true npm run test:mobile
E2E_PRODUCTION=true npm run test:responsive
npm run check:production
```

Install the three Playwright browsers and their OS dependencies first (`npx playwright install --with-deps chromium webkit firefox`). The managed workspace uses reviewed local wrapper paths through `E2E_WEBKIT_EXECUTABLE` and `E2E_FIREFOX_EXECUTABLE`; these do not disable the browser sandboxes. Normal supported Linux CI uses the standard Playwright installation. Run browser suites sequentially: they share the local web, SMTP, media, database and two realtime-worker fixtures. Raw traces, private mail/outbox files and environments are excluded from Git.

The new `tests/e2e/movie-journey.spec.ts` covers navigation, a genuine producer/actor filmography, licensed portrait attribution, both themes with axe checks, full keyboard focus through the compact cast rail, read-only theater choice, secure private invitations, two-client playback, unread messages, chat/player identity, leave/rejoin, direct room context, public reactions, public message rejection, revoked/private/anonymous access, future availability and real subtitle cues. Existing suites retain the fuller moderation, spam, clock-delay, reconnect, presence, region, authentication, account-deletion and HLS failure checks.

The responsive suite now includes person profiles and the authenticated theater chooser in the page matrix and enlarged-text checks. It exercises the existing screen-width, orientation, keyboard-height and native-segment scenarios with actual authenticated theater participants. Geometry checks are not a claim of physical-device compatibility or a complete accessibility certification.

| Check | Current result |
| --- | --- |
| `npm run check` | Pass: lint, TypeScript, 53 unit tests / 17 files, Prisma generation and production build. |
| Prisma status and database/schema diff | Pass: 12 applied migrations, no schema difference. |
| `npm audit` | Pass: zero known vulnerabilities in the full dependency graph at this check. |
| `E2E_PRODUCTION=true npm run test:e2e` | Pass: 34 cases, 7.2 minutes, clean final run. |
| Production-build mobile suite | Pass: 2 cases, 1.6 minutes; Chromium Android-style and WebKit iPhone-style emulation. |
| Three-engine responsive suite | Pass: 16 cases, 2 expected Chromium-only native-segment skips, 8.6 minutes. |
| `npm run check:production` | Intentionally blocked by missing launch configuration and verified founder disclosures, listed above. |

Chromium **156.0.8078.4**, WPE WebKit **27.2** and Firefox **157.0** each checked **950 layout states**: 780 page-family/theme/width states, 52 live-theater states, 52 waiting-room states and 66 enlarged-text states. All **2,850** measured states have zero document-horizontal-overflow findings. Each engine also passed 13 same-session viewport transitions, preserving video identity, socket connection, draft, membership and messages. Chromium alone passed native `viewport.segments` simulation with hinge-safe public/private controls and active two-viewer playback recovery. The fallback cases pass in the other engines; their native-CDP cases are intentionally skipped.

The 13 matrix widths are 320, 360, 375, 390, 430, 600, 768, 1024, 1280, 1440, 1920, 2560 and 3440px. Same-session cases additionally cover 280px cover-size, narrow folded widths, tall flip-style windows, unfolded widths, 844×390 landscape and a 390×400 keyboard-height viewport. This does not establish support for a particular cover screen or future device API.

All **27 published screenshots** were individually opened for review. Additional WebKit and Firefox inline-chat captures were inspected in both themes. The [machine-readable summary](watching-release/verification-summary.json) contains browser versions and counts, without private trace headers or invitation tokens. A repeat local seed preserves the 36 people / 48 credits and existing user, theater, message and invitation counts.

Existing public text-chat rejection was verified over HTTP and authenticated WebSockets, including history/message-level boundaries. Private unauthorized, removed and revoked users lose protected access; host/admin controls and regional restrictions remain server-enforced. Delayed two-client sync, reconnect, account reset/deletion, invitation limits and reaction spam checks pass. The existing bounded **100-authenticated-socket-viewer / two-worker** test passes; it is not a test of 100 simultaneous video decoders, global delivery or unlimited capacity.

## Regressions found during implementation

- Primary-action links inside section headings inherited muted link text. Explicit primary foreground/hover tokens restore contrast; both-theme axe checks cover the chooser.
- Subtitle cue data may arrive after React's initial language effect. Native track-load and cue-change listeners now reposition the loaded cues; the browser test checks actual `VTTCue.line` values and control visibility.
- A fast leave/rejoin can race the first server membership read. The server page now rechecks the current grant and uses the existing join flow only for an eligible `LEFT` member.
- Browser focus may consider a partially visible cast card visible enough, leaving alternating cards clipped. The focus handler scrolls only the horizontal region and disables rail snapping during focus; the keyboard test traverses every card at 320px.
- An older design test still expected “Cast & creators.” It was updated to assert the requested “Cast & crew” heading; the corrected browser case passes. The initial broad run reported 33 passes and this one failed assertion, before the clean final rerun.
- An interrupted prior run's video-advance assertion did not reproduce in the isolated acceptance repeat or the subsequent full acceptance runs. It is not presented as a diagnosed application bug.

Current unedited, inspected screenshots: [watching-release/README.md](watching-release/README.md). The exact changed paths for this phase are listed in [WATCHING-FILES.md](WATCHING-FILES.md); the preserved preceding responsive/finishing checkpoint has its own [inventory](RESPONSIVE-FILES.md).
