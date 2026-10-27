# Adaptive theaters and segmented displays

Audit date: 26 October 2026. This extends the existing application and the [responsive audit](RESPONSIVE.md); it does not replace authentication, theater authorization, media delivery or realtime infrastructure.

## Audit and implementation sequence

The existing private room already defaulted to inline chat and kept its draft in room state. Its message auto-scroll could scroll the entire page, and keyboard focus did not reveal the final reaction in a narrow tray. Fixed-width theater columns were tied to viewport breakpoints rather than actual available container space. There was no hinge-aware enhancement.

- [x] Phase 1 — Audit existing theater state, scrolling, responsive styles and checks.
- [x] Phase 2 — Reuse responsive foundations, measured navigation, safe areas and container queries.
- [x] Phase 3 — Keep smartphone private chat below video/film information with independent message scrolling.
- [x] Phase 4 — Adapt compact folded and tall flip-style viewports without device identification.
- [x] Phase 5 — Add optional validated hinge geometry, comfortable split panes and safe fallback.
- [x] Phase 6 — Adapt tablet, laptop, desktop and ultrawide layouts while keeping media identity stable.
- [x] Phase 7 — Preserve public emoji-only viewing; improve player controls, discovery, navigation and dialogs.
- [x] Phase 8 — Add focus, reduced-motion, touch, resize, multi-viewer and authorization regressions.
- [x] Phase 9 — Finish full browser matrix, record inspected captures and release boundaries.

## Implemented behavior

The same video element and room connection remain mounted during resizing. CSS chooses columns only when a useful movie area and chat area fit. Compact navigation follows the header's available width. On phones, private chat follows the player and film information; the picture can remain pinned while browsing messages when vertical space permits. Constrained editing viewports reduce the picture height or unpin it so the composer remains reachable. Composer focus corrects browser scrolling against the measured pinned picture, navigation and visible viewport; this fixes WebKit placing the newest message behind the picture without scrolling the message history or remounting media. Incoming messages scroll only the message pane; reading older messages does not jump the entire page. Screenshot review found a compact chat pane that hid all but the end of a normal message; the pane now reserves at least 180px for messages, and the browser regression checks that a complete short message article fits inside its scroller.

Supported browsers can supply [`window.viewport.segments`](https://developer.mozilla.org/en-US/docs/Web/API/Viewport/segments), or viewport-segment CSS environment variables. These experimental capabilities are optional. Measured, validated rectangles activate hinge-safe CSS. Comfortable left/right panes place the movie and private chat on separate segments; narrower, vertically segmented or asymmetric displays use one safe, scrollable pane. Dialogs, navigation and immersive player fallback remain within that pane. Unsupported browsers retain normal responsive layout. Discovery grids also use a named container query so a narrow physical pane gets compact poster density even when the overall viewport is wide. No device model, persistent hardware identifier, tracking SDK or new runtime dependency is introduced.

Reaction focus reveals a clipped button by scrolling only its tray. Public rooms still have no text chat, and existing backend rejection remains unchanged. Private chat, invitations, moderation and host-only playback authorization continue through their existing server paths.

## Validation

`tests/unit/viewport-layout.test.ts` covers safe rectangles, malformed geometry, ordinary fallback, narrow panes, keyboard occlusion and safe-area gutters. `tests/responsive/foldable.spec.ts` exercises two authenticated viewers, actual video and private messages during cover-size, folded, tall flip-style, unfolded, split-window and orientation changes. It checks video identity, draft preservation, socket stability, membership and input visibility. Chromium's CDP display-feature emulation exercises the browser's actual segment API and hinge-safe private/public layout; it is not physical-device testing.

The focused WebKit regression reproduced the newest message being obscured by its browser focus scroll, then passed after the composer correction. The 26 October lint/typecheck/49-unit-test/build check passes. Final full-suite results are recorded below after execution. Physical foldables, cover-screen browser availability, OS keyboards, iOS/iPadOS Safari, Android Chrome, native video-only fullscreen and assistive technologies require external device testing. Emulation cannot establish universal compatibility or future hardware support. No merge or deployment is authorized by this work.

## Verified checkpoint

The complete three-engine responsive run passed 16 cases with two expected native-CDP skips. All three engines passed the same-session private playback/chat/draft test. Chromium passed the active native-segment simulation, including safe dialogs/fullscreen, public emoji-only layout and pane-sized movie discovery. See [RESPONSIVE.md](RESPONSIVE.md) for exact versions, counts, commands and the later palette-change boundary.
