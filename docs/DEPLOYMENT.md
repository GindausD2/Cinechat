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
Origin is `APP_ORIGIN`. Use graceful SIGTERM and a >=60-second load-balancer idle
timeout. Redis adapter/pubsub handles events across workers; PostgreSQL owns
playback versions, memberships and moderation. Presence expires if a worker dies.

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
- `REGION_DEFAULT`: trusted deployment launch region. It drives license availability.
  For global delivery, use a trusted regional gateway and region-aware deployments.
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

## Stripe test billing

Leave `BILLING_ENABLED=false` until configuration is reviewed. To test, configure
`sk_test_…`, `STRIPE_PRO_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`, and enable billing.
Configure a recurring **test** price and Stripe's customer portal. Forward signed
events to `/api/billing/webhook`: `checkout.session.completed`,
`customer.subscription.created/updated/deleted`, `invoice.paid`,
`invoice.payment_failed`. The webhook reads raw body and verifies Stripe signatures;
live events and live keys are rejected. Duplicate event IDs are ignored. Subscription
state is retrieved from the provider and matched to the stored customer and price.

Plan upgrades require verified events. Returning from checkout alone does nothing.
Billing history is based on verified invoice events. Account deletion requires
subscription cancellation and completion of its active period before removing
account data. Payment-provider records follow the operator/provider retention
policy and are not represented as erased from Stripe by deleting local rows.

Live billing needs an explicitly approved separate change, selected supported launch
countries, published pricing/refund/tax terms and an actual provider smoke test.

## Operations and release checks

Readiness: web `GET /api/health`, realtime `GET /health`. Both verify Postgres and
Redis and return 503 on dependency failure, without revealing URLs or secrets.
Monitor service health, socket errors, report queue, email delivery and database
storage. Use Postgres backups/PITR and test restores. Apply retention to expired
tokens, notifications, reactions and operational logs according to your policies.

CI runs migration, seed, unit/browser tests and a production build. Before launch,
run all checks with configured providers, perform a two-browser session on HTTPS,
test invitation rejection, host moderation, reconnect and region restrictions, and
validate payment signature/replay handling with Stripe's real test events.

The operator must publish actual legal identity, public copyright/support contact,
retention terms, subprocessors, age/community procedures and jurisdiction-specific
privacy/billing notices. The local legal page already describes application behavior;
it explicitly marks operator-specific launch information as pending.
