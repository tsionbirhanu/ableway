# SRS 6.4 Security and privacy: checklist

Every requirement in SRS section 6.4, where it is implemented, and the
automated check that proves it. CI runs all of these checks. A unit test
(`tests/unit/security/srs-checklist.test.ts`) reads this file and fails if
any item is unchecked or any file listed under "Proof" does not exist.

> The SRS document itself is not in this repository. The requirements below
> are the section 6.4 list as given for this work. If the SRS wording differs,
> update the table and the code together.

Legend: **Code** is where it is implemented; **Proof** is the test or CI step
that checks it.

## Application security

| #     | Done | Requirement                                       | Code                                                                                            | Proof                                                                                                                                                                  |
| ----- | ---- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.4.1 | [x]  | Rate limiting on all API routes                   | `lib/api/handler.ts`, `lib/auth/rate-limit.ts`                                                  | `tests/unit/security/api-guards.test.ts` (429 per IP and per user; every route uses `withApi`), `tests/unit/auth/rate-limit.test.ts`                                   |
| 6.4.2 | [x]  | Request size limits                               | `lib/auth/params.ts`, `lib/api/handler.ts`                                                      | `tests/unit/security/api-guards.test.ts` (413 with and without Content-Length), `tests/unit/api/speech-routes.test.ts`                                                 |
| 6.4.3 | [x]  | Strict Zod validation                             | `lib/api/schemas.ts`, every `app/api/**/route.ts`                                               | `tests/unit/security/api-guards.test.ts` (no `z.object`, no `.passthrough()`, no raw body reads; unknown fields are 400), `tests/unit/security/privacy-routes.test.ts` |
| 6.4.4 | [x]  | Security headers and a CSP                        | `lib/security-headers.ts`, `next.config.ts`                                                     | `tests/unit/security/logging-headers.test.ts`                                                                                                                          |
| 6.4.5 | [x]  | CSRF protection for form posts                    | `lib/api/handler.ts` (Origin / Sec-Fetch-Site), Auth.js CSRF token, Server Actions origin check | `tests/unit/security/api-guards.test.ts`, `tests/unit/security/privacy-routes.test.ts` (cross-site account deletion refused)                                           |
| 6.4.6 | [x]  | CI check that no secrets appear in client bundles | `scripts/check-client-bundle.ts`, `.github/workflows/web-ci.yml` (job `security`)               | `tests/unit/security/client-bundle-scan.test.ts`, `tests/unit/secrets-boundary.test.ts`                                                                                |

## Privacy

| #      | Done | Requirement                                                                        | Code                                                                                                        | Proof                                                                                                                                                               |
| ------ | ---- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.4.7  | [x]  | No voice recordings stored by default                                              | `lib/speech/retention.ts`, `lib/speech/service.ts`, `lib/env.ts` (`SPEECH_RETAIN_AUDIO=false`)              | `tests/unit/security/privacy.test.ts`, `tests/unit/speech/service.test.ts`                                                                                          |
| 6.4.8  | [x]  | Opt-in and time-limited retention                                                  | `lib/privacy/voice-recordings.ts`, `lib/privacy/consent.ts`                                                 | `tests/unit/security/privacy.test.ts` (needs switch and learner opt-in; expiry set; withdrawal deletes), `tests/unit/security/privacy-routes.test.ts` (consent API) |
| 6.4.9  | [x]  | Consent records                                                                    | `lib/privacy/consent.ts`, `app/api/profile/consents/route.ts`, `drizzle/0008_privacy_consent_retention.sql` | `tests/unit/security/privacy.test.ts`, `tests/unit/security/privacy-routes.test.ts`                                                                                 |
| 6.4.10 | [x]  | Data export endpoint (JSON)                                                        | `lib/privacy/export.ts`, `app/api/profile/export/route.ts`                                                  | `tests/unit/security/privacy.test.ts`, `tests/unit/security/privacy-routes.test.ts`                                                                                 |
| 6.4.11 | [x]  | Account deletion that also removes conversations, Telegram links and subscriptions | `lib/privacy/delete-account.ts`, `app/api/profile/delete/route.ts`                                          | `tests/unit/security/privacy.test.ts`, `tests/unit/security/privacy-routes.test.ts`                                                                                 |
| 6.4.12 | [x]  | Retention job that deletes old conversations and audio after the configured period | `lib/privacy/retention.ts`, `app/api/cron/retention/route.ts`, `vercel.json`                                | `tests/unit/security/privacy.test.ts`, `tests/unit/security/privacy-routes.test.ts` (cron secret required)                                                          |

## Accountability

| #      | Done | Requirement                         | Code                                                                                                                                                                             | Proof                                                                                                                      |
| ------ | ---- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 6.4.13 | [x]  | Audit log for payment confirmations | `lib/audit.ts`, `app/api/payments/confirm/route.ts`                                                                                                                              | `tests/unit/api/routes.test.ts`                                                                                            |
| 6.4.14 | [x]  | Audit log for role changes          | `app/api/admin/profiles/[id]/role/route.ts`                                                                                                                                      | `tests/unit/security/privacy-routes.test.ts`                                                                               |
| 6.4.15 | [x]  | Audit log for knowledge edits       | `app/api/admin/knowledge/route.ts`, `app/api/admin/knowledge/[id]/route.ts`, `app/api/admin/knowledge/[id]/unpublish/route.ts`                                                   | `tests/unit/security/privacy-routes.test.ts`                                                                               |
| 6.4.16 | [x]  | Audit log for deletions             | `lib/privacy/delete-account.ts`, `app/api/admin/knowledge/[id]/route.ts`, `app/api/admin/unanswered/[id]/route.ts`, `app/api/subscriptions/route.ts`, `lib/privacy/retention.ts` | `tests/unit/security/privacy.test.ts` (audit log is append-only; deletion audited with counts only)                        |
| 6.4.17 | [x]  | Logging without personal data       | `lib/log.ts`, `eslint.config.mjs` (`no-console` in server code)                                                                                                                  | `tests/unit/security/logging-headers.test.ts`, `tests/unit/security/api-guards.test.ts` (500 logs carry no email or phone) |

## Documentation and process

| #      | Done | Requirement                                                                          | Code                                                                                          | Proof                                                                                                       |
| ------ | ---- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 6.4.18 | [x]  | Run a dependency audit                                                               | `.github/workflows/web-ci.yml` (`pnpm audit --audit-level high`), results in `../SECURITY.md` | CI job `security`                                                                                           |
| 6.4.19 | [x]  | SECURITY.md covering prompt injection                                                | `../SECURITY.md`, `lib/assistant/tools.ts`                                                    | `tests/unit/security/logging-headers.test.ts` (navigation stays on this site)                               |
| 6.4.20 | [x]  | SECURITY.md covering Telegram webhook spoofing                                       | `../SECURITY.md`, `app/api/telegram/route.ts`, `lib/telegram/linking.ts`                      | `tests/unit/telegram/telegram-bot.test.ts` (wrong or missing secret is 401)                                 |
| 6.4.21 | [x]  | SECURITY.md covering helper account misuse                                           | `../SECURITY.md`, `lib/auth/policies.ts`                                                      | `tests/unit/auth/policies.test.ts`, `tests/unit/security/privacy-routes.test.ts` (transfer only to helpers) |
| 6.4.22 | [x]  | Deployment guide for Vercel and Neon, including cron setup and environment variables | `docs/DEPLOYMENT.md`                                                                          | `tests/unit/security/srs-checklist.test.ts` (guide covers cron and every env variable)                      |

## How to re-verify

```bash
cd web
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
pnpm audit --audit-level high
pnpm build && pnpm check:bundle   # build with canary secrets as in CI
```
