# Current CineChat movie-watching screenshots

These are unedited screenshots of the actual local production build, captured on 27 October 2026 and individually opened for visual review. They show the latest champagne-gold theme. The blue-theme images in `../responsive-release/` document an earlier checkpoint.

Accounts, chat messages, screening names and viewer counts are synthetic test fixtures, not audience or commercial catalog claims. Movie artwork and playback frames are real legally reusable Blender assets. These are browser screenshots, not physical-device photographs or mockups. Content below a viewport remains accessible by scrolling.

| Screen | Viewport | Dark | Light |
| --- | --- | --- | --- |
| Movie details | 1440×1000 | [Image](movie-desktop-dark.png) | [Image](movie-desktop-light.png) |
| Movie details, phone | 390×844 | [Image](movie-mobile-dark.png) | [Image](movie-mobile-light.png) |
| Producer profile and filmography | 1440×1000 | [Image](person-desktop-dark.png) | [Image](person-desktop-light.png) |
| Person profile, compact phone | 320×844 | [Image](person-mobile-dark.png) | [Image](person-mobile-light.png) |
| Public/private theater chooser | 1440×1000 | [Image](watch-choice-desktop-dark.png) | [Image](watch-choice-desktop-light.png) |
| Private theater | 1440×1000 | [Image](private-desktop-dark.png) | [Image](private-desktop-light.png) |
| Private theater, phone | 390×844 | [Image](private-mobile-dark.png) | [Image](private-mobile-light.png) |
| Inline chat while watching and typing | 390×844 | [Image](private-chat-mobile-dark.png) | [Image](private-chat-mobile-light.png) |
| Public theater, emoji-only | 1440×1000 | [Image](public-desktop-dark.png) | [Full-page image](public-desktop-light.png) |
| Public theater, phone | 390×844 | [Image](public-mobile-dark.png) | [Image](public-mobile-light.png) |
| Native subtitle cues above phone controls | 390×844 | [Image](subtitles-mobile-dark.png) | [Image](subtitles-mobile-light.png) |
| Private theater after folded-width resize | 390×844 | [Image](private-folded-dark.png) | — |
| Same private session after unfolding | 1280×800 | [Image](private-unfolded-dark.png) | — |
| Composer with constrained keyboard-height viewport | 390×400 | [Image](private-keyboard-height-dark.png) | — |
| Native dual-screen private simulation | 1114×720 | [Image](dual-screen-private-dark.png) | — |
| Native dual-screen public simulation | 1114×720 | [Image](dual-screen-public-dark.png) | — |

The public desktop light capture is the original 1440×1423 full-page image, including film details and rights attribution. In this headless Chromium run, successive full-page/viewport captures sometimes omitted a paused video's composited layer; the gallery retains the original capture that visibly contains the film, rather than editing pixels. Actual play, pause, seeking, cross-viewer synchronization and frame progression are independently exercised in browser tests. The caption images show a clearly labeled player fixture with attribution cues in Spanish, not a translated full-film subtitle release.

Adaptive captures follow two real authenticated browser participants in the same session. The constrained-height view prioritizes the visible message composer and letterboxed film, with messages available by scrolling. Dual-screen images use Chromium's native display-feature emulation: two 540px panes and a 34px hinge. Private video/chat occupy separate safe panes; public viewing uses one safe pane and retains emoji-only controls. These tests preserve the video element, socket, draft and membership during resizing. The photos do not depict a physical hinge, device keyboard or unannounced hardware.

Film artwork and frames: **Big Buck Bunny © 2008 Blender Foundation**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [official project and rights](https://peach.blender.org/about/). Related catalog artwork and font/icon notices are documented in [ASSET-LICENSE-AUDIT.md](../ASSET-LICENSE-AUDIT.md). The low-resolution local film is the licensed test source; production media quality and CDN delivery require separate verification.

Ton Roosendaal's original portrait: **William Maanders, 2008**, [CC BY 3.0 Netherlands](https://creativecommons.org/licenses/by/3.0/nl/deed.en), [source](https://commons.wikimedia.org/wiki/File:Ton_Roosendaal_2008.jpg). Attribution remains visible on his profile. Other people use initials until licensed photographs are supplied.

Implementation, migrations, test results and launch boundaries: [WATCHING-EXPERIENCE.md](../WATCHING-EXPERIENCE.md).
