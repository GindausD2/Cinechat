# Third-party code and data flows — 22–24 October 2026

This inventory describes code in this repository, not verified vendor contracts or deployment locations. Versions are from the lockfile after the trust improvements. No production services were provisioned or contacted with user credentials.

| Library / integration | Version | Purpose and data boundary | Findings / limits |
| --- | --- | --- | --- |
| Next.js, React, React DOM | 16.4.3 / 19.3.0 / 19.3.0 | Web/server rendering; selected UI data reaches the browser. | Server authorization remains required; dynamic private pages and no-store APIs. CSP retains Next's inline-script allowance; not a strict nonce CSP. |
| Auth.js, Prisma adapter | 5.0.0-beta.32 / 2.11.3 | Sign-in, encrypted JWT cookie, account identifiers. | Auth.js is a prerelease dependency; continue upstream review. 14-day sessions; fresh account/authVersion checks. No second auth system. |
| Google OAuth (conditional) | Auth.js provider | Chosen sign-in: Google receives login traffic; app receives verified email/provider ID/name/avatar. | No credentials supplied here; actual Google OAuth not browser-verified. New account links omit Google API access/refresh/ID tokens. Maintenance clears unused legacy Google tokens. Provider identity remains necessary for repeat sign-in. |
| Prisma client / PostgreSQL | 6.19.3 | Server-only application data storage and transactions. | Hosting company, country, TLS/at-rest encryption, backup schedule and access roles require operator verification. Not a Supabase deployment. |
| ioredis, Socket.IO Redis adapter | 5.11.1 / 8.3.0 | Server-only rate limits, short-lived presence, inter-instance event fanout. | No permanent presence/device profiles. Configure private TLS Redis and restricted network access for launch. |
| Socket.IO client/server | 4.8.4 | Authenticated theater playback/chat/reactions. | Current membership, tickets, age, region, blocking, host/admin roles rechecked. Public fanout omits actor IDs; private chat remains member-only. |
| bcryptjs | 3.0.3 | Server-side password and optional theater-code hashing. | Passwords are never stored in readable form; enforce bcrypt's byte limit. |
| cinechat-mailer (npm alias of nodemailer) | 10.1.4 | Essential verification, reset and requested deletion email via configured SMTP. | Sends email address and account link to operator's SMTP provider. No marketing sender/list or email analytics. Dev outbox is private filesystem-only; production requires SMTP. |
| Hls.js | 1.7.3 | Browser playback of licensed HLS manifests/segments and quality selection. | Media host sees network traffic. Only allowed, authorized, dated, age/region-eligible sources. No DRM bypass or host video relay. |
| AWS S3 SDK | 3.1151.0 | Server-side upload script for authorized media to configured object storage. | Does not request browser device permissions. Access key is server-only; operator should scope permissions to the media bucket. No public bucket is provisioned by this task. |
| @fontsource Inter / Montserrat | 5.3.0 / 5.3.0 | Locally hosted typography. | OFL 1.1 notices copied into public/legal/licenses. No Google Fonts calls. |
| Lucide React | 0.577.0 | Bundled interface icons. | ISC with Feather MIT portions; complete shipped notice retained. No network/data collection. |
| Motion | 12.43.0 | Bundled UI transitions. | No service/telemetry integration. Existing reduced-motion rules retained. |
| Tailwind | 4.3.3 | Build-time CSS generation. | No runtime service or personal-data integration. |
| Zod | 4.6.7 | Input/event validation. | No network calls; validated body/message/code/URL sizes. |
| dotenv | 17.4.2 | Server/script environment loading. | No secrets committed or exposed through new NEXT_PUBLIC variables. |
| Vitest / @vitest/mocker | 4.1.12 | Development-only automated tests. | Updated within major 4 to fix GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp. Test server is not deployed. |
| Playwright / axe | 1.64.0 / 4.13.0 | Development-only browser/accessibility checks. | Traces/screenshots may contain fixture data; CI artifacts expire after seven days. Do not run fixture tests against production accounts. |
| Stripe | removed | Previously installed but unreachable behind disabled billing. | SDK removed. Prior implementation retained as non-executable .txt references in docs/legacy. Existing financial tables/records preserved; billing endpoints still hard-disabled regardless of environment flags. |
| FrameXTV | disabled | Unverified external movie API. | No API requests or streaming integration activated; contract, reliability and distribution permission remain unverified. |

## Requests and storage

- No analytics/ad SDK, behavioral pixel, fingerprinting SDK, embedded social widget, camera/microphone/location permission or marketing subscription was found or added.
- Current browser storage inventory is published at `/legal/cookies`. Theme choice persists until cleared; external-image choice is versioned and expires after 180 days. Optional images default to blocked, with equal accept/reject/customize actions and footer controls. No nonessential network request is authorized by agreeing to Terms.
- Default artwork/fonts are local. Remote avatars/custom images require optional permission and use anonymous cross-origin requests without referrers; rejected or failed avatars retain initials. Video is an explicit service request, delivered independently of the app server. An official trailer is loaded only on explicit action and a reviewed allowlist; a metadata trailer URL alone no longer creates a player.
- Google sign-in and messaging-share/credit links are user-initiated outbound navigation, not embedded trackers. Operators must inspect those services' actual policies and any hosting-level cookies separately.

## Vulnerability results

Starting `npm audit`: 2 moderate development dependency findings (Vitest and its mocker), 0 high/critical. Both underlying advisories are fixed in 4.1.12. After that update and removal of the unused payment SDK, the 22 October audit reported no advisories. A fresh 23 October audit then identified new critical/high advisories in Next.js 16.4.0: [SVG image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Action denial of service](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), and [cached typed-array handling](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Next.js was updated within version 16 to **16.4.3**. The subsequent full `npm audit` reports **0 vulnerabilities across runtime and development dependencies**. This is a package-advisory snapshot, not proof of security. CI audits all dependencies, including development dependencies.

No unrelated major-version upgrade or new runtime dependency was introduced. The operator still needs patch monitoring, a deployed-header/cookie scan, provider DPAs/transfer review, least-privilege infrastructure credentials, operational log review and a response process for security disclosures.

The 24 October finishing audit identified three new Nodemailer address-parser advisories, reported as two moderate affected package entries (the application mailer and development SMTP receiver): [nested comments](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8), [quoted semicolons](https://github.com/advisories/GHSA-m943-m63m-w62w), and [quoted angle brackets](https://github.com/advisories/GHSA-85x2-q946-cp5h). Both copies were patched from **10.1.1 to 10.1.4**; the existing SMTP test server has a scoped dependency override. No unrelated package was upgraded. The subsequent full audit reports **0 vulnerabilities**. The browser acceptance suite exercises verification, reset and requested deletion through loopback SMTP; external SMTP still needs an operator smoke test.

## Outdated-package review

`npm outdated --json` was also run on 22 October. The table below records that historical snapshot, excluding Next.js, which was subsequently patched to 16.4.3 after the new advisories appeared. The mailer row predates the 24 October patch described above. Available newer versions are not automatically vulnerabilities. Non-vulnerable updates below were left for a separate compatibility change; the demonstrated moderate advisories were fixed. In particular, do not downgrade Auth.js 5 to the registry's stable v4 tag, replace Prisma's database/configuration model, or upgrade the Redis/TypeScript/ESLint major versions as part of a privacy patch. Test infrastructure uses Node 24 types deliberately.

| Package | Current | Wanted within range | Latest tag |
| --- | --- | --- | --- |
| @aws-sdk/client-s3 | 3.1151.0 | 3.1155.0 | 3.1155.0 |
| @axe-core/playwright | 4.13.0 | 4.14.0 | 4.14.0 |
| @eslint/js | 9.39.5 | 9.39.5 | 10.0.1 |
| @playwright/test | 1.64.0 | 1.64.1 | 1.64.1 |
| @prisma/client | 6.19.3 | 6.19.3 | 7.10.1 |
| @types/node | 24.19.2 | 24.19.2 | 26.6.5 |
| @types/nodemailer | 7.0.12 | 7.0.12 | 8.0.2 |
| cinechat-mailer:nodemailer@^10.1.1 | 10.1.1 | 10.2.0 | 10.2.0 |
| concurrently | 9.2.5 | 9.2.5 | 10.0.6 |
| dotenv | 17.4.2 | 17.4.2 | 18.0.8 |
| eslint | 9.39.5 | 9.39.5 | 10.13.0 |
| ioredis | 5.11.1 | 5.11.1 | 6.0.0 |
| lucide-react | 0.577.0 | 0.577.0 | 1.61.0 |
| motion | 12.43.0 | 12.43.0 | 14.6.0 |
| next-auth | 5.0.0-beta.32 | 5.0.0-beta.32 | 4.24.15 |
| prisma | 6.19.3 | 6.19.3 | 8.0.0-rc.25 |
| react | 19.3.0 | 19.3.1 | 19.3.1 |
| react-dom | 19.3.0 | 19.3.1 | 19.3.1 |
| smtp-server | 3.19.22 | 3.21.0 | 3.21.0 |
| typescript | 5.9.3 | 5.9.3 | 7.0.2 |
| typescript-eslint | 8.71.2 | 8.72.0 | 8.72.0 |
| vitest | 4.1.12 | 4.1.12 | 5.0.5 |

Routine React/mail/S3 patches and test-tool updates listed above remain maintenance follow-ups, not claims that those installed versions have known advisories. Auth.js provider login itself remains unverified without Google credentials. Its implemented onboarding boundary requires affirmative policy review before new theater creation/joining, preserves safe invitation return paths, and leaves account export/deletion available without agreement.

## 26 October 2026 recheck

The resumed responsive/foldable work adds no runtime dependency, analytics or device-identification SDK. A fresh full `npm audit` reports zero known vulnerabilities. The existing focused Nodemailer 10.1.4 patch and asset/font boundaries are preserved. An audit snapshot is not a guarantee that dependencies are free of security issues.
