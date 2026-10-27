# Trust update — exact changed paths

Relative to audited baseline `63f0f3a` in GindausD2/Cinechat. Existing billing reference files were moved to non-executable text; their database records are preserved. No unrelated repository or production data was changed.

**114 affected paths**, including added/updated files and the three archived source locations. Historical V1 reports remain unchanged.

| Exact path | Description |
| --- | --- |
| [.env.example](../.env.example) | Public operator/contact disclosures, launch countries, service-age floor and verified sender placeholder. |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Audit runtime and development dependencies in the existing full CI workflow. |
| [README.md](../README.md) | Trust documentation, migration/cleanup commands and complete dependency-audit instructions. |
| [docs/ASSET-LICENSE-AUDIT.md](../docs/ASSET-LICENSE-AUDIT.md) | Artwork/video/trailer/font/icon licenses, attribution and unresolved rights boundaries. |
| [docs/THIRD-PARTY-AUDIT.md](../docs/THIRD-PARTY-AUDIT.md) | Dependency purpose/data inventory, advisory fixes and deferred-update snapshot. |
| [docs/TRUST-AUDIT.md](../docs/TRUST-AUDIT.md) | Twenty-item audit, actual validation, migrations, run/configuration and launch/legal blockers. |
| [docs/TRUST-FILES.md](../docs/TRUST-FILES.md) | Exact affected paths and descriptions for the trust update relative to 63f0f3a. |
| [docs/legacy/README.md](../docs/legacy/README.md) | Explain disabled archival payment code and preserved legacy records. |
| [docs/legacy/billing-page.tsx.txt](../docs/legacy/billing-page.tsx.txt) | Preserved non-executable previous billing page. |
| [docs/legacy/billing-route.ts.txt](../docs/legacy/billing-route.ts.txt) | Preserved non-executable previous checkout route. |
| [docs/legacy/billing-webhook.ts.txt](../docs/legacy/billing-webhook.ts.txt) | Preserved non-executable previous webhook. |
| [docs/legacy/billing.ts.txt](../docs/legacy/billing.ts.txt) | Preserved non-executable previous Stripe boundary. |
| [docs/trust-release/contact-1440-dark.png](../docs/trust-release/contact-1440-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/contact-1440-light.png](../docs/trust-release/contact-1440-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/contact-390-dark.png](../docs/trust-release/contact-390-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/contact-390-light.png](../docs/trust-release/contact-390-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/cookie-1440-dark.png](../docs/trust-release/cookie-1440-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/cookie-1440-light.png](../docs/trust-release/cookie-1440-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/cookie-390-dark.png](../docs/trust-release/cookie-390-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/cookie-390-light.png](../docs/trust-release/cookie-390-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/deletion-1440-dark.png](../docs/trust-release/deletion-1440-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/deletion-1440-light.png](../docs/trust-release/deletion-1440-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/deletion-390-dark.png](../docs/trust-release/deletion-390-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/deletion-390-light.png](../docs/trust-release/deletion-390-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/privacy-1440-dark.png](../docs/trust-release/privacy-1440-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/privacy-1440-light.png](../docs/trust-release/privacy-1440-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/privacy-390-dark.png](../docs/trust-release/privacy-390-dark.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [docs/trust-release/privacy-390-light.png](../docs/trust-release/privacy-390-light.png) | Unmodified browser capture opened for visual review; fixture account data only. |
| [next.config.ts](../next.config.ts) | Suppress referrer data on invitation, account and third-party requests. |
| [package-lock.json](../package-lock.json) | Lock the reviewed dependency removal and security updates. |
| [package.json](../package.json) | Remove unused Stripe, patch Next.js and Vitest, and expose privacy maintenance command. |
| [prisma/migrations/20261022000100_policy_acceptance/migration.sql](../prisma/migrations/20261022000100_policy_acceptance/migration.sql) | Add versioned acceptance and notification actor FK/index without fake backfill. |
| [prisma/migrations/20261022000200_privacy_retention_indexes/migration.sql](../prisma/migrations/20261022000200_privacy_retention_indexes/migration.sql) | Index bounded credential/reaction retention queries. |
| [prisma/migrations/20261022000300_deleted_message_redaction/migration.sql](../prisma/migrations/20261022000300_deleted_message_redaction/migration.sql) | Allow erased deletion tombstones while preserving nonempty live-message constraints. |
| [prisma/migrations/20261022000400_private_profile_defaults/migration.sql](../prisma/migrations/20261022000400_private_profile_defaults/migration.sql) | Private profile/friend-request defaults for future accounts; preserve existing choices. |
| [prisma/schema.prisma](../prisma/schema.prisma) | Policy acceptance records, notification actor cascade, retention indexes and future private-profile defaults. |
| [public/legal/licenses/inter.txt](../public/legal/licenses/inter.txt) | Complete shipped Inter OFL notice. |
| [public/legal/licenses/lucide.txt](../public/legal/licenses/lucide.txt) | Complete shipped Lucide/Feather ISC/MIT notices. |
| [public/legal/licenses/montserrat.txt](../public/legal/licenses/montserrat.txt) | Complete shipped Montserrat OFL notice. |
| [realtime/server.ts](../realtime/server.ts) | Periodic bounded maintenance and fresh private-presence audience authorization. |
| [scripts/check-production.mjs](../scripts/check-production.mjs) | Reject missing founder identity/contact/territory disclosures before launch. |
| [scripts/privacy-maintenance.ts](../scripts/privacy-maintenance.ts) | Dry-run counts and explicit bounded cleanup CLI. |
| [src/app/account-deleted/page.tsx](../src/app/account-deleted/page.tsx) | Clear post-deletion receipt and local sign-out confirmation. |
| [src/app/api/account/data/route.ts](../src/app/api/account/data/route.ts) | Authenticated no-store data export excluding credentials and others’ private text. |
| [src/app/api/account/deletion/route.ts](../src/app/api/account/deletion/route.ts) | Same-account, CSRF-protected, rate-limited deletion-link requests. |
| [src/app/api/account/policies/route.ts](../src/app/api/account/policies/route.ts) | Explicit, versioned, idempotent acknowledgement records. |
| [src/app/api/account/route.ts](../src/app/api/account/route.ts) | Protect younger-account privacy and immutable age; support secure password/email deletion. |
| [src/app/api/admin/route.ts](../src/app/api/admin/route.ts) | Treat new floating reactions as ephemeral in platform statistics. |
| [src/app/api/community/route.ts](../src/app/api/community/route.ts) | Enforce younger-account connection restrictions while retaining safety/disconnect actions. |
| [src/app/api/register/route.ts](../src/app/api/register/route.ts) | Persist required acknowledgement and private-first profile choices transactionally. |
| [src/app/cinemas/new/page.tsx](../src/app/cinemas/new/page.tsx) | Require policy review before new theater creation, preserving safe return routes. |
| [src/app/clubs/[id]/page.tsx](../src/app/clubs/[id]/page.tsx) | Exclude private/younger profiles from public club membership lists. |
| [src/app/community/page.tsx](../src/app/community/page.tsx) | Discover only adult accounts that opted into public profiles. |
| [src/app/contact/page.tsx](../src/app/contact/page.tsx) | Verified project details, explicit missing founder disclosures and self-service contact guidance. |
| [src/app/delete-account/page.tsx](../src/app/delete-account/page.tsx) | Authenticated email-link confirmation page. |
| [src/app/globals.css](../src/app/globals.css) | Policy layouts, privacy controls, accessible forms, contrast and responsive consent dialogs. |
| [src/app/layout.tsx](../src/app/layout.tsx) | Shared optional-image privacy provider and visible policy/contact/preferences links. |
| [src/app/legal/cookies/page.tsx](../src/app/legal/cookies/page.tsx) | Actual authentication cookies, browser storage, optional images and lifetimes. |
| [src/app/legal/page.tsx](../src/app/legal/page.tsx) | Readable policy index, actual rights evidence and font/icon/artwork credits. |
| [src/app/legal/privacy/page.tsx](../src/app/legal/privacy/page.tsx) | Actual data collection, private messaging, retention, transfers, rights and launch gaps. |
| [src/app/legal/refunds/page.tsx](../src/app/legal/refunds/page.tsx) | Free V1 statement without subscription/refund or payment flows. |
| [src/app/legal/safety/page.tsx](../src/app/legal/safety/page.tsx) | Age-policy boundaries, private-message safety, reporting and parental-consent limitations. |
| [src/app/legal/terms/page.tsx](../src/app/legal/terms/page.tsx) | Free-service rules, authorized viewing, moderation and provisions requiring legal review. |
| [src/app/movies/[id]/page.tsx](../src/app/movies/[id]/page.tsx) | Consent-aware artwork and reviewed, explicitly loaded official trailers. |
| [src/app/onboarding/page.tsx](../src/app/onboarding/page.tsx) | Provider/legacy policy review with safe invitation return and profile completion. |
| [src/app/page.tsx](../src/app/page.tsx) | Consent-aware artwork, starter-catalog disclosure and accurate editorial section labels. |
| [src/app/profile/[username]/page.tsx](../src/app/profile/[username]/page.tsx) | Enforce current age/privacy choices and accessible consent-aware avatars. |
| [src/app/register/page.tsx](../src/app/register/page.tsx) | Communicate required policy/age acknowledgements without optional marketing. |
| [src/app/settings/page.tsx](../src/app/settings/page.tsx) | Visible privacy/export/preferences/deletion controls and safe onboarding return. |
| [src/app/theme.css](../src/app/theme.css) | Accessible form-control border tokens for both themes. |
| [src/app/watch/[id]/page.tsx](../src/app/watch/[id]/page.tsx) | Review policies before starting a new solo theater. |
| [src/auth.ts](../src/auth.ts) | Store necessary Google account identity without unused provider API tokens. |
| [src/components/auth-form.tsx](../src/components/auth-form.tsx) | Unchecked required acknowledgements and provider onboarding preserving invitation links. |
| [src/components/authorized-trailer.tsx](../src/components/authorized-trailer.tsx) | Load the approved official trailer only after a deliberate action. |
| [src/components/avatar.tsx](../src/components/avatar.tsx) | Named image semantics, initials fallback and optional external-image protection. |
| [src/components/cinema-player.tsx](../src/components/cinema-player.tsx) | Gate optional remote poster requests while preserving playback controls/synchronization. |
| [src/components/cookie-preferences.tsx](../src/components/cookie-preferences.tsx) | Conditional equal-choice consent, persistent preferences and accessible review dialog. |
| [src/components/delete-account-form.tsx](../src/components/delete-account-form.tsx) | Password or short-lived email confirmation with explicit consequences and request receipt. |
| [src/components/join-room.tsx](../src/components/join-room.tsx) | Offer a clear route to required policy review before joining. |
| [src/components/movie-card.tsx](../src/components/movie-card.tsx) | Use consent-aware artwork without changing movie navigation. |
| [src/components/policy-acknowledgement.tsx](../src/components/policy-acknowledgement.tsx) | Required affirmative policy review with preserved destination. |
| [src/components/policy-page.tsx](../src/components/policy-page.tsx) | Shared readable policy layout and policy-version navigation. |
| [src/components/privacy-image.tsx](../src/components/privacy-image.tsx) | Block optional third-party images until permitted; omit credentials/referrers and handle failures. |
| [src/components/room-client.tsx](../src/components/room-client.tsx) | Exit immediately even offline, stop reconnection after leaving and preserve private chat. |
| [src/components/settings-form.tsx](../src/components/settings-form.tsx) | Age-safe privacy settings, clear data deletion and onboarding completion. |
| [src/components/theater-lobby.tsx](../src/components/theater-lobby.tsx) | Use consent-aware screening artwork. |
| [src/lib/account-deletion.ts](../src/lib/account-deletion.ts) | Serialize deletion-link issuance/consumption and erase associated data with revocation. |
| [src/lib/api.ts](../src/lib/api.ts) | Preserve explicit Response headers for authenticated account downloads. |
| [src/lib/authorized-trailers.ts](../src/lib/authorized-trailers.ts) | Reviewed official URL/host/age allowlist with actual license attribution. |
| [src/lib/billing.ts](../src/lib/billing.ts) | Hard-disabled V1 payment boundary; prior implementation retained as a text reference. |
| [src/lib/community.ts](../src/lib/community.ts) | Minimize exposed public activity and associate notifications with erasable actor records. |
| [src/lib/cookie-preferences.ts](../src/lib/cookie-preferences.ts) | Validated, versioned 180-day image permission and safe local/external URL classification. |
| `src/lib/legacy/billing-page.tsx` | Archived as docs/legacy/billing-page.tsx.txt; unavailable legacy code no longer compiles. |
| `src/lib/legacy/billing-route.ts` | Archived as docs/legacy/billing-route.ts.txt; unavailable legacy code no longer compiles. |
| `src/lib/legacy/billing-webhook.ts` | Archived as docs/legacy/billing-webhook.ts.txt; unavailable legacy code no longer compiles. |
| [src/lib/live.ts](../src/lib/live.ts) | Ephemeral floating reactions and immediate/private-message text redaction, including retries. |
| [src/lib/media.ts](../src/lib/media.ts) | Apply service-age floor alongside licensed movie age and regional rights. |
| [src/lib/operator.ts](../src/lib/operator.ts) | Read verified public operator configuration without invented identity or contact information. |
| [src/lib/policy-acceptance.ts](../src/lib/policy-acceptance.ts) | Server-side policy-version checks for new theater operations. |
| [src/lib/privacy-maintenance.ts](../src/lib/privacy-maintenance.ts) | Bounded cleanup of expired credentials, legacy deleted text/reactions and unused Google tokens. |
| [src/lib/privacy.ts](../src/lib/privacy.ts) | Shared policy version, deletion-token lifetime, configurable age floor and safe privacy defaults. |
| [src/lib/rooms.ts](../src/lib/rooms.ts) | Backend acknowledgement guards, privacy-filtered public snapshots and idempotent leave. |
| [src/lib/theaters.ts](../src/lib/theaters.ts) | Apply service-age policy to screening availability. |
| [src/lib/validation.ts](../src/lib/validation.ts) | Explicit acknowledgement, age policy and bcrypt UTF-8 access-code size validation. |
| [tests/e2e/acceptance.spec.ts](../tests/e2e/acceptance.spec.ts) | Preserve original account/theater acceptance with explicit policy acknowledgements. |
| [tests/e2e/community.spec.ts](../tests/e2e/community.spec.ts) | Verify adult discovery using explicit profile opt-in fixtures. |
| [tests/e2e/helpers.ts](../tests/e2e/helpers.ts) | Required account acknowledgements, optional discoverability and concurrent email-link collection. |
| [tests/e2e/privacy.spec.ts](../tests/e2e/privacy.spec.ts) | Eight real browser/API/DB/realtime policy, consent, age, export/deletion, retention and revocation cases. |
| [tests/e2e/scaling.spec.ts](../tests/e2e/scaling.spec.ts) | Retain multi-worker concurrent-viewer tests with explicit policy acknowledgement. |
| [tests/e2e/theaters.spec.ts](../tests/e2e/theaters.spec.ts) | Retain creation/invitation and theater-design checks with explicit policy acknowledgement. |
| [tests/e2e/worldwide.spec.ts](../tests/e2e/worldwide.spec.ts) | Retain global-screening checks with explicit policy acknowledgement. |
| [tests/unit/privacy.test.ts](../tests/unit/privacy.test.ts) | Consent expiry/corruption, URL privacy, age/cutoff, policy and authorized trailer cases. |
| [tests/unit/rooms.test.ts](../tests/unit/rooms.test.ts) | Reject multibyte theater codes beyond bcrypt’s 72-byte limit. |
| [tests/unit/security.test.ts](../tests/unit/security.test.ts) | Keep registration validation fixtures explicit about required acknowledgements. |
