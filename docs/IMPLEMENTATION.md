# CineChat V1 implementation checklist

Repository: `https://github.com/GindausD2/Cinechat` (confirmed by owner).
Baseline: `92b5a61a56d609802af5aa3850fca7a75d128a57`.
Inspection: the only tracked file is README.md. No existing dependencies, application,
database, authentication configuration, or AGENTS.md instructions were found.

## Architecture

Next.js App Router + React + TypeScript; Tailwind CSS and Motion; Auth.js with
PostgreSQL/Prisma; a dedicated authenticated Socket.IO Node service; Redis for
cross-process events, presence and rate limits. PostgreSQL is the authority for
room membership, moderation and playback. Video streams come directly from
approved media delivery hosts. No video proxy or unauthorized streaming provider.

## Phases and completion gates

- [x] 1. Foundation: design primitives, schema/migration, registration, sessions,
      verification/reset, privacy, lint/type checks/build and authentication tests.
- [x] 2. Discovery: rights-aware catalog, provider boundary, search/filters,
      movie pages, profiles, watchlists/history and catalog tests.
- [x] 3. Rooms: public/private access, capacity, membership, expiring hashed
      invitation tokens, host moderation and permission tests.
- [x] 4. Live cinema: server-authoritative playback, reconnect/drift correction,
      WebSocket chat/reactions, presence and two-client acceptance tests.
- [x] 5. Community: following/friends, clubs, reminders, notifications,
      reports, blocking, admin management and authorization tests.
- [x] 6. Readiness: disabled-by-default Stripe boundary, billing, health checks,
      deployment configuration/docs, security review and full acceptance tests.

Every phase is checked with lint, TypeScript, tests appropriate to its behavior,
and a production build. External credentials and untested flows are recorded in
the final verification report. Public deployment and live charges are disabled.

## Known integration boundaries

Google OAuth, transactional email, production PostgreSQL/Redis, production media
storage, payment credentials and commercial streaming licenses are not configured.
Local development uses actual PostgreSQL and Redis, licensed Blender open films,
and a local-only email outbox. Live email delivery never uses the development outbox.
