# CineChat public and private theaters

Repository: **GindausD2/Cinechat**. This is an incremental update to the existing
application at `302fb67403b8f8342e8f1ef67dbedac5483954fb`.

## Result

| Public Theater | Private Theater |
| --- | --- |
| Authorized film and host-controlled synchronized playback | Authorized film and host-controlled synchronized playback |
| Live viewers, join/leave, fullscreen | Live participants, join/leave, fullscreen |
| ❤️ 😂 😮 😢 👏 🔥 👍 cinema reactions | The same seven cinema reactions and private message likes |
| No text chat, input, panel, toggle, or message notifications | Collapsible real-time member-only chat |
| Viewer list with host reaction muting and participant removal | Viewer list with host chat/reaction muting and participant removal |
| Public discovery and room reporting | Hashed invitation links, optional hashed access codes, revocation, expiry, and use limits |

Reactions are delivered through the existing authenticated Socket.IO/Redis
infrastructure. The browser renders received events, rather than fabricating
successful local reactions. Floating reactions disappear after 2.8 seconds; at
most seven are shown at once. Reduced motion removes movement while retaining
the brief reaction display. The player owns the reaction overlay, so it remains
available inside fullscreen.

Private theaters use refined blue accents, a spacious heading, and the existing
glass chat overlay. Public theaters give the full content width to the player.
Desktop and mobile use the established black/blue and white/blue theme tokens.
The compact player uses its playback-control button rather than placing a second
play button over the reaction bar.

## Creation, discovery, and saved settings

The creator first offers **Public Theater — Watch with everyone** and **Private
Theater — Watch with invited friends**. The second step collects theater name,
description, an age/region-authorized film, capacity, schedule, and an optional
private access code. These use the existing database fields and plan limits.
Pro users can save Blue or Midnight atmospheres in the existing `theme` column.
Legacy theme values remain accepted and use restrained blue styling.

All, Public, Private, and Upcoming discovery filters share one server query.
Private results require existing active or previous authorized membership;
banned members are excluded. Anonymous private discovery requests receive 401.
The lobby refreshes real room metadata and Redis viewer counts every ten seconds
while visible. No playable URLs or private messages are included in discovery.

## Server restrictions

- `sendMessage` checks active membership and private visibility before writing.
  Both WebSocket and HTTP message actions call this same service.
- Public room snapshots do not query message history and return an empty
  `messages` array. Historical records are retained for authorized moderation.
- Redis delivery rechecks each socket's session, membership, and media rights.
  Public message events and message-targeted reaction events are discarded,
  including events injected directly into the shared bus.
- Public message-targeted reactions and message reports are forbidden. Room
  reports, host moderation, and cinema-level emoji reactions remain available.
- Private history and messaging return 404 to nonmembers and removed members.
  Joining a private room requires a valid invitation and any configured code.
- Reaction validation accepts exactly seven emoji values. A shared atomic Redis
  limit permits ten reactions per user per ten seconds across HTTP and WebSockets.
  Muted members cannot react. Chat and room-action rate limits remain in place.
- HTTP actions require a validated server session and same-origin mutation.
  WebSockets require signed, expiring, database-validated tickets.

The room API now accepts `{ "action": "message", "body": "..." }` and
`{ "action": "reaction", "emoji": "❤️" }` on `POST /api/rooms/:id`.
Private message reactions may include `messageId`. These actions use the same
permissions, media eligibility, moderation, persistence, and events as WebSockets.
`GET /api/rooms?type=public|private|all` provides filtered discovery; the default
remains public. `upcoming=true` limits results to scheduled future screenings.

## Database and integrations

No new migration or destructive data operation is required. Existing visibility,
theme, memberships, invitations, playback, messages, and reactions tables support
the correction. The PostgreSQL foundation and safety-constraint migrations remain
in place. Authentication, media providers, social features, admin tools, and
Free/Pro limits continue using their existing implementations.

Only previously authorized media is played. No new artwork, streaming provider,
credential, or commercial distribution permission is introduced. FrameXTV remains
disabled pending verified API terms and rights. Live Stripe charges remain disabled.
Production OAuth, SMTP, managed database/Redis, object storage/CDN, and Stripe
configuration still require operator credentials and provider smoke tests.

## Run and deploy

Use the existing [local setup](../README.md#run-locally) and
[deployment instructions](DEPLOYMENT.md). An existing installation needs updated
code, `npm ci`, `npm run db:generate`, `npm run db:migrate`, and `npm run build`.
Restart both the web and real-time services so the public message restriction
is applied at both boundaries. Do not leave an old real-time worker serving
public chat during a rollout. PostgreSQL, Redis, and separate media delivery
remain required. This change does not deploy the application publicly.

## Verification

Verified against the compiled production application, PostgreSQL 17, Redis 7,
and the authorized local MP4 source on 2026-10-14:

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 22 tests pass in 9 files |
| `npm run build` | Pass; optimized Next.js production build |
| `E2E_PRODUCTION=true npm run test:e2e` | All 10 tests pass in 1.6 minutes |
| Automated WCAG 2.1 A/AA checks | No violations across 20 page/theme/viewport states |
| `npm run db:migrate` | Both existing migrations current; no pending migration |
| `npm audit --omit=dev` | Zero vulnerabilities |
| `git diff --check` | Pass |

The focused public test uses two browser users and another authenticated socket
for the same host. It confirms unique live viewer counting, all seven emojis on
both screens and the additional socket, removal after 2.8 seconds, actual animation
and reduced-motion CSS, fullscreen controls, drift below 1.5 seconds, host
play/pause/seek, leave/rejoin/reload, reaction muting, and room reporting. HTTP and
WebSocket text sends are rejected for both host and guests. A historical public
message and a direct Redis message publication do not reach snapshots or viewers.

The focused private test covers real database-persisted Blue customization,
nonmember denial, invitation/code verification, revoked and expired links,
one-use exhaustion, HTTP and WebSocket private messages, emojis and message likes,
host permissions, muted/removed member denial, and ten accepted mixed HTTP/WS
reactions followed by 429 responses with no extra persisted reaction.

The existing suite also passes private two-viewer playback/chat/reconnect,
capacity races, moderation and admin report handling, reminders, following,
friendships, clubs/quotas, private profiles, notifications, verification/reset,
account deletion, and disabled billing. These tests use synthetic local accounts
and a loopback-only SMTP receiver; no real mail or charges are sent.

Browser coverage uses Chromium with desktop and mobile viewports. Additional
public-player overflow checks cover widths 320, 360, 768, and 1024 pixels. Physical
iOS/Android devices, Safari/WebKit, production provider credentials, a commercial
media CDN, and multi-node load/failure scenarios were not tested in this update.


## Visually inspected captures

These twelve captures were opened and reviewed for spacing, contrast, poster
cropping, player controls, reaction placement, and the absence of public chat.
The complete automated run also saves full-page and viewport captures for Home
and movie detail pages in the ignored `test-results` directory. Private mobile
links show the full page with its collapsible chat below the player.

| Surface | Desktop dark | Desktop light | Mobile dark | Mobile light |
| --- | --- | --- | --- | --- |
| Public theater | [Dark](theaters/screenshots/public-desktop-dark.png) | [Light](theaters/screenshots/public-desktop-light.png) | [Dark](theaters/screenshots/public-mobile-dark.png) | [Light](theaters/screenshots/public-mobile-light.png) |
| Private theater | [Dark](theaters/screenshots/private-desktop-dark.png) | [Light](theaters/screenshots/private-desktop-light.png) | [Dark](theaters/screenshots/private-mobile-dark.png) | [Light](theaters/screenshots/private-mobile-light.png) |
| Theater creator | [Dark](theaters/screenshots/creator-desktop-dark.png) | [Light](theaters/screenshots/creator-desktop-light.png) | [Dark](theaters/screenshots/creator-mobile-dark.png) | [Light](theaters/screenshots/creator-mobile-light.png) |


## Changed files

This theater update changes 39 files, including the twelve inspected PNG
captures listed above. No dependency manifest, schema, migration, authentication
configuration, or unrelated project is replaced.

```text
README.md
docs/IMPLEMENTATION.md
docs/THEATERS.md
docs/theaters/screenshots/creator-desktop-dark.png
docs/theaters/screenshots/creator-desktop-light.png
docs/theaters/screenshots/creator-mobile-dark.png
docs/theaters/screenshots/creator-mobile-light.png
docs/theaters/screenshots/private-desktop-dark.png
docs/theaters/screenshots/private-desktop-light.png
docs/theaters/screenshots/private-mobile-dark.png
docs/theaters/screenshots/private-mobile-light.png
docs/theaters/screenshots/public-desktop-dark.png
docs/theaters/screenshots/public-desktop-light.png
docs/theaters/screenshots/public-mobile-dark.png
docs/theaters/screenshots/public-mobile-light.png
realtime/server.ts
src/app/api/reports/route.ts
src/app/api/rooms/[id]/route.ts
src/app/api/rooms/route.ts
src/app/billing/page.tsx
src/app/cinema.css
src/app/cinemas/new/page.tsx
src/app/cinemas/page.tsx
src/app/legal/page.tsx
src/components/cinema-player.tsx
src/components/create-room-form.tsx
src/components/room-client.tsx
src/components/theater-lobby.tsx
src/components/theater-reactions.tsx
src/lib/live.ts
src/lib/reactions.ts
src/lib/rooms.ts
src/lib/theaters.ts
src/lib/validation.ts
tests/e2e/acceptance.spec.ts
tests/e2e/design.spec.ts
tests/e2e/security.spec.ts
tests/e2e/theaters.spec.ts
tests/unit/rooms.test.ts
```
