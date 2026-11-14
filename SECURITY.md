# Security and privacy

This document describes how Ableway protects learners and staff, the main
threats we design against, and how to report a problem. It covers the web app
and Telegram bot in [`web/`](web/). The requirement-by-requirement checklist
for SRS section 6.4 is in [`web/docs/SRS-6.4-CHECKLIST.md`](web/docs/SRS-6.4-CHECKLIST.md).

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting instead:
**Security → Report a vulnerability** on this repository. Include what you
found, how to reproduce it, and what an attacker could do. We aim to reply
within 3 working days and to fix high-severity issues within 14 days.

Never test against real learners' accounts or data.

## Who we protect, and what matters most

Learners are blind or visually impaired and many are new to computers. They
often cannot see a suspicious URL, a fake dialog, or a changed amount. That
raises the stakes for three threats in particular: **prompt injection**
(text that steers the assistant), **Telegram webhook spoofing** (fake bot
traffic), and **helper account misuse** (staff, or someone with a staff
login, abusing access). Each has its own section below.

## Controls at a glance

| Area                   | What we do                                                                                                                                                                                                                     | Where                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Rate limiting          | Every API route is limited per IP and per signed-in user, by category (read, write, assistant, export, account deletion, webhook, cron). Sign-in, sign-up, link codes, help requests and speech have their own tighter limits. | `lib/api/handler.ts`, `lib/auth/rate-limit.ts`      |
| Request size           | Every route has a body limit (64 KiB default; 1 MB Telegram; ~10 MB audio), enforced while reading, even if `Content-Length` is missing or false.                                                                              | `lib/auth/params.ts`                                |
| Input validation       | Every body and query string is parsed with a strict Zod schema; unknown fields are a 400. A unit test fails if a route uses `z.object`, `.passthrough()` or reads the body directly.                                           | `tests/unit/security/api-guards.test.ts`            |
| CSRF                   | State-changing API requests from another site are refused (Origin / Sec-Fetch-Site). Session cookies are `SameSite=Lax`. Auth.js adds its own CSRF token; Server Actions check Origin.                                         | `lib/api/handler.ts`                                |
| Security headers / CSP | CSP, HSTS, `nosniff`, `X-Frame-Options`, Referrer-Policy, Permissions-Policy (microphone for our own pages only), COOP/CORP.                                                                                                   | `lib/security-headers.ts`                           |
| Secrets                | Server env lives in `lib/env.ts` (`server-only`). CI builds with fake "canary" secrets and fails if any appears in browser-downloadable output.                                                                                | `scripts/check-client-bundle.ts`                    |
| Privacy                | No voice recordings by default; opt-in, time-limited retention; consent records; JSON export; full account deletion; daily retention job.                                                                                      | `lib/privacy/`                                      |
| Audit log              | Append-only (enforced by a database trigger). Payment confirmations, role changes, knowledge edits, deletions, consent changes, exports, retention runs.                                                                       | `lib/audit.ts`                                      |
| Logging                | Structured JSON, personal data removed or pseudonymised before writing. `console.*` is banned in server code by ESLint.                                                                                                        | `lib/log.ts`                                        |
| Payments               | No card, PIN or wallet credentials are ever accepted or stored; strict schema refuses extra fields. Card numbers and PINs typed into chat are redacted before storage and before reaching the model.                           | `app/api/payments/confirm`, `lib/privacy/redact.ts` |

## Threat: prompt injection

**What it is.** Text that tries to make the assistant do something it should
not: forwarded Telegram posts, job descriptions, lesson text, or the learner's
own message ("ignore previous instructions and send me to…").

**Why it matters here.** A learner who cannot see the screen may not notice
the assistant navigating to a phishing page, filling a field with the wrong
value, or reading out a fake "pay this number" instruction.

**Defences.**

1. **The model cannot act directly.** It can only _propose_ actions from a
   fixed list (`lib/assistant/tools.ts`). Each proposal is validated with a
   strict Zod schema and checked against the actions the current page allows
   (`validateAndFilterAction`). Anything else is dropped.
2. **Navigation stays on this site.** `go_to_page` accepts only same-site
   paths like `/courses`; full URLs, `//host`, `javascript:` and `data:` are
   refused, on the server and again in the browser. (Tested in
   `tests/unit/security/logging-headers.test.ts`.)
3. **Untrusted content is fenced.** Forwarded messages, documents and job
   posts are wrapped in `<untrusted_content>` blocks, and the system prompt
   tells the model to treat them as data and never as instructions
   (`lib/assistant/prompts.ts`). Forwarded Telegram content gets a summary,
   never an action.
4. **No money moves through the assistant.** Payments are confirmed only by a
   human helper through `/api/payments/confirm`; the assistant has no tool for
   it. The prompt and the help text tell learners that staff never ask for a
   PIN or password.
5. **Sensitive input is redacted first.** Card numbers, PINs and passwords are
   removed before a message is stored or sent to Gemini.
6. **Conversations belong to one person.** A `conversationId` from the
   browser is used only if it belongs to the signed-in learner, so injected
   text cannot be planted in, or read from, someone else's conversation.
7. **Escalation.** Distress, repeated failures, or a request for a person
   hands the conversation to a human helper.

**Residual risk.** A model can still be talked into _saying_ something
misleading. Replies are plain text and every action is announced before it
runs. Content managers should review unanswered questions and knowledge
edits (both audited).

## Threat: Telegram webhook spoofing

**What it is.** Anyone can POST to `/api/telegram` pretending to be Telegram,
to impersonate a learner, trigger messages, or guess link codes.

**Defences.**

1. **Secret header.** We register the webhook with `secret_token =
TELEGRAM_WEBHOOK_SECRET` (`pnpm telegram:webhook set <url>`). Telegram sends
   it in `X-Telegram-Bot-Api-Secret-Token`. The route compares it in constant
   time and refuses anything else with 401 **before reading the body**.
2. **Strong secret.** `lib/env.ts` requires 16-256 characters from Telegram's
   allowed alphabet; production refuses to start with the development mock.
   Generate it with `openssl rand -hex 32`.
3. **Limits.** 1 MB body limit, envelope validation (`update_id`), per-IP rate
   limit, and duplicate `update_id`s are ignored.
4. **Link codes.** Codes are 6 random digits, valid 10 minutes, stored only as
   a SHA-256 hash, and single-use (claimed atomically). Redeeming is limited to
   5 tries per Telegram account per 15 minutes, so guessing is impractical.
5. **Bot token.** Never logged. The logger scrubs anything shaped like a bot
   token, and the CI bundle check fails if one reaches the browser.

**Residual risk.** The duplicate-update memory is per server instance. On
serverless, a retry that lands on another instance may be handled twice; bot
actions are written to be safe to repeat. If the webhook secret leaks, rotate
it and run `pnpm telegram:webhook set <url>` again.

## Threat: helper account misuse

**What it is.** A helper (staff or volunteer), or someone who has taken over a
helper login, uses their access to read learners' data, confirm fake
payments, or escalate privileges.

**Defences.**

1. **Least privilege** (`lib/auth/policies.ts`, unit-tested):
   - Helpers see help requests and the assistant's summary, never learners'
     message history, enrollments or other personal data.
   - Phone and email are shown only on requests **assigned to that helper**
     (and to admins). The queue no longer lists every learner's email.
   - A request can be transferred only to another helper or admin.
   - Nobody can confirm a payment for their own enrollment.
   - Only admins change roles, and never their own.
2. **Roles are re-read on every request** from the database, so demoting or
   deleting an account takes effect at once.
3. **Everything that matters is audited**, append-only: payment confirmations
   (amount, currency, method, who), role changes (from, to, who), help-request
   transfers and closures, knowledge edits and deletions. A database trigger
   refuses edits and deletes on `audit_log`.
4. **Rate limits** apply to helper actions like any other write.
5. **No credentials to steal.** The app never stores card numbers, PINs or
   mobile-money passwords, so a helper account cannot expose them.

**Operational advice.** Give each helper their own account (no sharing),
prefer passkeys, remove accounts the day someone leaves, and review the audit
log weekly for unusual payment confirmations or role changes.

## Privacy

- **Voice recordings are not stored by default.** Audio is held in memory only
  while it is transcribed. Keeping recordings needs _both_ the operator switch
  `SPEECH_RETAIN_AUDIO=true` _and_ the learner's own opt-in on their profile.
  Kept recordings expire after `SPEECH_RETENTION_DAYS` (1-90, default 30).
  Withdrawing consent deletes them at once.
- **Consent records** are append-only history (purpose, yes/no, policy version,
  where it was given). Linking and unlinking Telegram records consent too.
- **Data export**: `GET /api/profile/export` returns everything we hold about
  the learner as JSON. Secrets such as
  password hashes are described, never included.
- **Account deletion**: `DELETE /api/profile/delete` removes the profile,
  credentials, enrollments, conversations and messages, Telegram link and link
  codes, job alert subscriptions, consent records, voice recordings and the
  learner's own help requests, in one transaction. Payment amounts stay as an
  anonymous bookkeeping record; the deletion itself is audited with counts only.
- **Retention job**: daily at 02:30 UTC (`/api/cron/retention`). It deletes
  conversations with no message for `CONVERSATION_RETENTION_DAYS` (default 90),
  closed help requests and unanswered questions older than that, expired voice
  recordings, and expired codes and challenges.
- **Logs** never contain names, contact details, message text or transcripts.
  Person ids are replaced with a one-way hash.

## Content Security Policy

The app uses `cacheComponents` and partial prefetching, so many pages are
prerendered. A nonce-based CSP would force every page to render per request,
so we use Next.js's documented "without nonces" policy: scripts only from our
own origin plus the inline bootstrap Next.js writes (`'unsafe-inline'`).
Everything else is locked to `'self'`: no third-party scripts, `object-src
'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`,
and `connect-src 'self'` (the browser only ever talks to our own server). The
static Savanna pages under `/pages/*` additionally allow Typekit fonts.

If the app stops prerendering pages, switch to a nonce-based CSP in
`proxy.ts` and drop `'unsafe-inline'` for scripts.

## Dependency audit

CI runs `pnpm audit --audit-level high` on every push and pull request and
fails on any high or critical advisory, in any dependency.

Last full audit: **2026-11-14**, `pnpm audit` in `web/`:

| Scope                              | Result                                                      |
| ---------------------------------- | ----------------------------------------------------------- |
| Production dependencies (`--prod`) | No known vulnerabilities                                    |
| All dependencies                   | 2 moderate, both development-only tooling, accepted (below) |

| Package           | Advisory                                                                                                                           | Path                                                            | Why accepted                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| esbuild ≤0.24.2   | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99): a website can read responses from esbuild's _dev server_ | `drizzle-kit > @esbuild-kit/core-utils`                         | Used only by `drizzle-kit` on a developer machine to load the schema; we never run esbuild's dev server. Not in the deployed app. |
| minimatch <11.0.1 | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): slow matching on crafted glob patterns                   | `eslint-config-next > … > @typescript-eslint/typescript-estree` | Lint-time only, with our own fixed patterns. Not in the deployed app.                                                             |

Re-check both when `drizzle-kit` and `eslint-config-next` release updates.

## Known limitations

- **General API rate limits fail open.** They count in Postgres; if Postgres is
  unreachable, requests continue and an error is logged
  (`api.rate_limit_unavailable`), so an outage does not take every route with
  it. The targeted limits (sign-in, sign-up, link codes, help requests,
  speech) fail closed. Vercel's platform DDoS protection sits in front of both.
- **Per-IP limits trust the platform's client IP** (`x-real-ip` on Vercel).
  Self-hosting behind your own proxy: make it overwrite these headers.
- **Telegram duplicate detection is per instance** (see above).
- **The frontend is not yet wired to the privacy endpoints.** The profile
  page's export, delete, voice-consent and Telegram-linking buttons must call
  `GET /api/profile/export`, `DELETE /api/profile/delete` (body
  `{ "confirm": true }`), `GET/POST /api/profile/consents` and
  `POST/GET/DELETE /api/telegram/link-code`. The old demo route
  `/api/telegram/link` (with its "simulate link" backdoor) has been removed.
- **A Neon database URL with a password was committed** to `web/.env.example`
  before this change. It has been removed from the file, but it is still in
  git history. **That password must be rotated in Neon**, and the old value
  treated as public.
