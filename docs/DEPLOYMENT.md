# Deployment preparation

Nothing is deployed publicly. The provided code, migrations, Dockerfile, health
checks and CI are ready for configured infrastructure and operator review.

## Services

Deploy the web service (`npm start`) and the realtime service
(`npm run start:realtime`) independently using the Docker image. A managed container
host with persistent WebSocket support is suitable. Use managed PostgreSQL 17+ and
Redis 7+ close to both services. The local Compose database/Redis bind to localhost
and are intended for development, not a public production data tier.

Use HTTPS for both service origins and WSS for WebSocket transport. The web
origin's `NEXT_PUBLIC_WS_URL` must point to the public HTTPS realtime origin at
build time. The Socket.IO server upgrades to WebSocket on `/socket.io/`; route that
path to the realtime service and retain upgrade headers. Its only allowed browser
Origin is `APP_ORIGIN`. Redact bearer tokens in `/invite/` paths from proxy logs. Use graceful SIGTERM and a >=60-second load-balancer idle
timeout. Redis adapter/pubsub handles events across workers. WebSocket-only transport
needs no sticky polling sessions; all replicas must share Redis, database, origins
and `REALTIME_SECRET`. Route upgrades across workers and drain them gracefully.
PostgreSQL owns playback versions, memberships and moderation. Per-socket leases
expire after 45 seconds if a worker dies; unique users are
counted across their tabs and workers. Authorization/playback heartbeats run every
10 seconds, with fresh batched database checks per active local room.

`DATABASE_POOL_SIZE` defaults to 10 per process unless `DATABASE_URL` already sets
`connection_limit`. Budget the total across web/realtime replicas and migrations.
The included browser test exercises 100 synthetic viewers across two workers and
two concurrent rooms; perform workload/region/CDN testing before promising larger
production audiences. Operational limits are 1,000 public seats, 50 private seats,
and 20 active theaters per creator, equal for all accounts.

```sh
docker build \
  --build-arg NEXT_PUBLIC_WS_URL=https://realtime.your-domain.example \
  --build-arg MEDIA_ALLOWED_HOSTS=media.your-domain.example,download.blender.org \
  -t cinechat:v1 .
```

In the managed Codex environment, supply the optional proxy CA using BuildKit
`--secret id=proxy_ca,src="$CODEX_PROXY_CERT"`. Preserve configured proxy settings
and TLS verification. The session CA is never stored in an image layer.

Deploy web and realtime using the same image, with distinct commands. Inject
secrets at runtime using your hosting secret manager. Do not copy `.env` into the
image. Run `npm run db:migrate` once as a release job, before starting either
service. Then run `npm run db:seed` only for the explicitly selected curated catalog.
Seed is idempotent and does not enable or overwrite an existing media source.

## Environment

Use `.env.example` as a key reference. Required production configuration:

- `DATABASE_URL`: managed Postgres URL with TLS and appropriate pooling.
- `REDIS_URL`: authenticated TLS Redis URL; isolate from public Internet.
- Separate random `AUTH_SECRET` and `REALTIME_SECRET` (>=32 characters).
- Matching HTTPS `AUTH_URL` and `APP_ORIGIN`; HTTPS `NEXT_PUBLIC_WS_URL` at build
  and runtime. Pin the application host in your trusted reverse proxy.
- `SMTP_URL`, `EMAIL_FROM`: transactional mail with verified sender/domain.
  Disable `EMAIL_DEV_OUTBOX`. Registration refuses to run without real mail in
  production. Configure Google callback at `/api/auth/callback/google` if using
  `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
- `REGION_DEFAULT`: fallback launch region for license availability.
- Optional `TRUSTED_COUNTRY_HEADER`: country header from your trusted edge, for
  example a verified platform country header. Configure only when the proxy
  **overwrites** it and direct origin access is blocked. Two-letter country values
  are validated and bound to the WebSocket ticket; the browser cannot select its
  region through Socket.IO. Leaving this unset ignores all client country headers.
- `MEDIA_ALLOWED_HOSTS`: explicit approved CDN hostnames at build and runtime.
  Disable `ALLOW_LOCAL_MEDIA` and remove localhost for launch.
- `ADMIN_EMAILS`: bootstrap administrator emails before account registration.

Run `npm run check:production` with production variables. It intentionally fails
for the local sample configuration. Build-time public URLs are not secrets.

## Authorized object storage and media CDN

`npm run media:upload` uploads the licensed Big Buck Bunny sample and updates its
MediaSource URL. Configure `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION`,
`OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`, optional
`OBJECT_STORAGE_ENDPOINT`, and `MEDIA_CDN_BASE_URL`. The CDN must use HTTPS and be
listed in `MEDIA_ALLOWED_HOSTS`. The script does not change bucket permissions.
Set access using your storage infrastructure and configure byte-range/CORS behavior.

Use a separate CDN for film delivery. The application never proxies streams. For
protected commercial sources, add a license-approved entitlement/token signer at
the existing media authorization boundary and short-lived CDN URLs. Do not store
commercial files on the app server or expose them with the local sample server.
Existing V1 sources are Creative Commons open films; no DRM or paywall bypass exists.

Every new source needs rights evidence, license dates, region constraints and
attribution. Disable a source from the admin dashboard during a rights review;
active clients are disconnected at their next permission heartbeat. Buffered
client data cannot be recalled. Validate HLS manifests, renditions, subtitles and
mobile browser support with the actual licensed production delivery service.

## Email and reminders

SMTP delivers verification/reset messages. The real-time service processes in-app
screening reminders every minute. `npm run reminders` can also be invoked by a
scheduler; deduplication makes concurrent scheduler/service runs safe. Alerts never
reveal private rooms to unauthorized accounts. Notification delivery is in-app;
screening-reminder email/push delivery is a future extension.

## Free access and legacy data

No checkout, billing portal, subscription, or paid entitlement is active. Both
billing POST routes return 503 and `billingConfigured()` always returns false,
even if legacy flags/keys remain in the environment. No payment secrets are needed.
Archived handlers live under `src/lib/legacy/`; legacy tables are preserved. New
registrations do not create subscriptions and old plan values grant no privileges.

Apply migration `20261017000100_free_global_theaters` before rolling out **both**
web and realtime workers. It widens public capacity, binds a membership to the
invitation used for access, and stores ticket regions. Existing private guest
memberships have no provable invitation grant and must redeem a new valid link;
hosts retain access. Revocation or expiry removes grant-based access, including
rejoin and private message reads. Deploy both services together so older workers
cannot continue using old authorization rules. Back up before the release.

Scheduled public premieres start from their server UTC timestamp. Viewers see local
browser timezone labels. Missed premieres past the film runtime are ended rather
than restarted. A host playback action supersedes automatic scheduling. Completed public films close on the server even when no host browser remains.
Private rooms remain host-controlled. A host network drop leaves the shared timeline
running; explicitly leaving a private theater pauses it.

## Operations and release checks

Readiness: web `GET /api/health`, realtime `GET /health`. Both verify Postgres and
Redis and return 503 on dependency failure, without revealing URLs or secrets.
Monitor service health, socket errors, report queue, email delivery and database
storage. Use Postgres backups/PITR and test restores. Apply retention to expired
tokens, notifications, reactions and operational logs according to your policies.

CI runs migration, seed, unit/browser tests and a production build. Before launch,
run all checks with configured providers, perform a two-browser session on HTTPS,
test invitation rejection, host moderation, reconnect, region restrictions and
CDN/HLS recovery using the actual launch sources.

The operator must publish actual legal identity, public copyright/support contact,
retention terms, subprocessors, age/community procedures and jurisdiction-specific
privacy notices. The local legal page already describes application behavior;
it explicitly marks operator-specific launch information as pending.
