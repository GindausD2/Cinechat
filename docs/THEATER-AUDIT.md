# Theater completion audit — 2026-10-17

Confirmed repository: GindausD2/Cinechat. Baseline: 545bb72.
The working tree was clean. Existing Next.js/Auth.js, PostgreSQL/Prisma,
Socket.IO/Redis, media delivery, and public/private authorization are retained.

Already implemented: authorized catalog, authentication, public emoji-only
rooms, private text chat, host playback, versioned playback state, drift
correction, basic invitations/codes, moderation, responsive themes, and tests.

Gaps: Free/Pro gates still restrict seats, rooms, themes and clubs. Old private
memberships can rejoin without checking invitation validity. Invitations have a
fixed expiry, login loses the invitation destination, and upcoming screenings
show UTC. Presence broadcasts locally, fanout revalidates sockets with separate
database queries, and heartbeats write per socket. Capacity is capped at 50.
The player lacks quality selection and explicit HLS/timeline recovery. Cross-node
fanout, larger audiences, invitation expiry, timezones, and failures need tests.

- [x] Free access and safely isolated, disabled legacy billing.
- [x] Additive grant/capacity migration and valid invitation rejoin.
- [x] Public/private discovery, invitation sharing, and local screening times.
- [x] Batched authorization, atomic cross-node presence, reconnect recovery.
- [x] Quality/subtitle support and recovery to authoritative playback.
- [x] Multi-node, concurrent-room, permissions, media failure and browser tests.
- [x] Lint, types, production build, screenshots, and delivery report.

Completed implementation and verification: [FREE-THEATERS.md](FREE-THEATERS.md).
