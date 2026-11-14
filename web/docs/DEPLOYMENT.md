# Deploying Ableway to Vercel and Neon

This guide takes the web app and Telegram bot in `web/` from nothing to a
running production deployment: a Neon Postgres database, a Vercel project,
environment variables, migrations, the two cron jobs, and the Telegram
webhook. Read [`../../SECURITY.md`](../../SECURITY.md) first.

You need: a GitHub account with access to this repository, a Vercel account,
a Neon account, Node 22 or newer, and pnpm 10 (`corepack enable`).

## 1. Create the Neon database

1. In the Neon console, create a project. Pick the region closest to where
   your Vercel functions run (Vercel's default is Washington, D.C., `iad1`,
   so choose AWS `us-east-1`). Database name: `neondb` is fine.
2. Keep the default branch (`main`) for production. Optionally create a
   `preview` branch for Vercel preview deployments, so previews never touch
   real learner data.
3. Copy two connection strings from **Connect**:
   - the **pooled** one (host contains `-pooler`): the app uses this;
   - the **direct** one (no `-pooler`): use this for migrations.
     Both look like `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require`.
4. Turn on point-in-time restore (Neon keeps history for 1 day on Free and
   longer on paid plans). This is your backup.

pgvector is enabled by the first migration (`drizzle/0000_enable_pgvector.sql`);
you do not need to install anything.

> **Rotate the old password.** A Neon connection string with a password was
> committed to `web/.env.example` before the security work. If that database
> is the one you are deploying, reset the role's password in Neon
> (**Roles → Reset password**) before going live, and use only the new string.

## 2. Run the migrations

From `web/`, with the **direct** connection string:

```bash
pnpm install --frozen-lockfile
DATABASE_URL='postgresql://…direct…' pnpm db:migrate
```

The script prints only the host, never the password. Run it again after
every release that adds a file under `web/drizzle/`. It is safe to run twice.

Optional, for a demo: `DATABASE_URL='…' pnpm db:seed` loads sample courses.
Do not seed production with sample people.

## 3. Create the Vercel project

1. **Add New → Project**, import this repository.
2. **Root Directory**: `web`.
3. Framework preset: **Next.js**. Leave the build command as the default
   (`pnpm build`, from `package.json`) and the install command as
   `pnpm install --frozen-lockfile`.
4. **Node.js version** (Settings → General): 22.x or 24.x.
5. Do not deploy yet. Add the environment variables first (next step).

If you use the Neon integration from the Vercel Marketplace instead, it sets
`DATABASE_URL` for you and can create a Neon branch per preview deployment.
Check that the value it sets is the **pooled** string.

## 4. Environment variables

Set these in **Settings → Environment Variables**. None may have a
`NEXT_PUBLIC_` prefix: they are all server-only, and CI fails if one reaches
the browser. In production the server refuses to start if a required value is
missing, invalid, or still a development mock. Check a file locally with
`pnpm env:check path/to/file` (prints names only).

| Variable                          | Required   | What to put                                                                         | How to generate           |
| --------------------------------- | ---------- | ----------------------------------------------------------------------------------- | ------------------------- |
| `DATABASE_URL`                    | Yes        | Neon **pooled** connection string                                                   | Neon console → Connect    |
| `AUTH_SECRET`                     | Yes        | Session signing key, 32+ characters                                                 | `openssl rand -base64 32` |
| `APP_URL`                         | Yes        | Public URL, no trailing slash, e.g. `https://ableway.example`                       | Your domain               |
| `CRON_SECRET`                     | Yes        | 16+ characters. Vercel sends it to the cron routes                                  | `openssl rand -hex 32`    |
| `GEMINI_API_KEY`                  | Yes        | Google AI Studio key (assistant, embeddings, Gemini speech)                         | aistudio.google.com       |
| `TELEGRAM_BOT_TOKEN`              | Yes        | From @BotFather, `123456789:ABC…`                                                   | @BotFather → /newbot      |
| `TELEGRAM_WEBHOOK_SECRET`         | Yes        | 16-256 of `A-Z a-z 0-9 _ -`                                                         | `openssl rand -hex 32`    |
| `STT_API_KEY`                     | Yes        | Speech-to-text key (Azure Speech key, or any non-empty value with Gemini)           | Azure portal              |
| `TTS_API_KEY`                     | Yes        | Text-to-speech key (same Azure key works)                                           | Azure portal              |
| `SPEECH_PROVIDER`                 | Yes        | `gemini` or `azure`. `mock` is refused in production                                | —                         |
| `AZURE_SPEECH_REGION`             | If `azure` | e.g. `eastus`                                                                       | Azure portal              |
| `SPEECH_LOW_CONFIDENCE_THRESHOLD` | No         | 0 to 1, default `0.65`                                                              | —                         |
| `SPEECH_RETAIN_AUDIO`             | No         | `false` (default). `true` only with a documented reason; learners must still opt in | —                         |
| `SPEECH_RETENTION_DAYS`           | No         | 1-90, default `30`                                                                  | —                         |
| `CONVERSATION_RETENTION_DAYS`     | No         | 1-730, default `90`                                                                 | —                         |
| `SMS_ENABLED` / `SMS_API_KEY`     | No         | `false` unless an SMS provider is set up                                            | Provider console          |
| `FFMPEG_PATH`                     | No         | Leave empty; the bundled ffmpeg is used                                             | —                         |

Scope them:

- **Production**: real values.
- **Preview**: a _different_ `AUTH_SECRET`, `CRON_SECRET` and
  `TELEGRAM_WEBHOOK_SECRET`; a Neon `preview` branch for `DATABASE_URL`; a
  separate test bot token (or leave the bot unset and accept that Telegram
  features are off). Turn on **Deployment Protection** so previews are not
  public.

Never paste production secrets into `.env.example`, issues, or chat. If a
secret leaks, rotate it at the provider, update it here, and redeploy.

## 5. Deploy

Click **Deploy** (or push to `main`). Then check:

```bash
curl -s https://YOUR_APP/api/health
# {"status":"ok","time":"…"}

curl -sI https://YOUR_APP/ | grep -iE 'content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy'
# All six headers should be present.
```

## 6. Cron jobs

`web/vercel.json` defines two jobs:

| Path                  | Schedule (UTC)                    | What it does                                                                                                        |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/alerts`    | `*/15 * * * *` (every 15 minutes) | Sends job alerts to subscribed learners                                                                             |
| `/api/cron/retention` | `30 2 * * *` (daily, 02:30)       | Deletes old conversations, expired voice recordings, expired codes and old rate-limit windows; writes one audit row |

How it works: when `CRON_SECRET` is set in the project, Vercel calls each path
with `GET` and the header `Authorization: Bearer <CRON_SECRET>`. Both routes
refuse anything else with 401. Crons run on **production deployments only**.

Plan limits: on the **Hobby** plan, Vercel cron jobs may run at most once a
day, so the 15-minute alerts schedule needs **Pro**. On Hobby, either change
the alerts schedule to daily, or call it from another scheduler (for example a
GitHub Actions `schedule:` workflow) with the same bearer header.

Check them:

1. Vercel dashboard → **Settings → Cron Jobs**: both jobs are listed.
2. Run one by hand:

   ```bash
   curl -s -H "Authorization: Bearer $CRON_SECRET" https://YOUR_APP/api/cron/retention
   # {"ok":true,"deleted":{"conversations":0,…}}
   curl -s -o /dev/null -w '%{http_code}\n' https://YOUR_APP/api/cron/retention
   # 401
   ```

3. Logs (**Logs**, filter `cron.`): look for `cron.retention.done` and
   `cron.alerts.done` every run. `cron.*.failed` means a run failed; it will
   try again at the next schedule.

## 7. Telegram webhook

After the first production deploy, point the bot at the app. From `web/`, with
the production values in your shell (or a local env file that is never
committed):

```bash
pnpm telegram:webhook set https://YOUR_APP
pnpm telegram:webhook get
```

`set` registers `https://YOUR_APP/api/telegram` with `secret_token =
TELEGRAM_WEBHOOK_SECRET`. Telegram then sends that secret with every update,
and the route refuses requests without it. `get` should show your URL,
`pending_update_count` near 0, and no `last_error_message`.

Whenever you rotate `TELEGRAM_WEBHOOK_SECRET`, run `set` again, or Telegram's
updates will be refused with 401.

## 8. First admin

Create your account through the normal sign-up page, then promote it once in
the Neon SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@your-org.example';
```

After that, use `PATCH /api/admin/profiles/{id}/role` (admins only, audited)
for every other role change. Do not edit roles in SQL again; SQL edits are not
in the audit log.

## 9. Before going live

- [ ] Neon password rotated if it was ever committed (step 1).
- [ ] `SPEECH_PROVIDER` is `gemini` or `azure`; the server starts (no env errors in logs).
- [ ] `/api/health` returns ok; the security headers are present (step 5).
- [ ] Both cron jobs listed and a manual retention run returns `ok` (step 6).
- [ ] Telegram webhook set and `getWebhookInfo` shows no error (step 7).
- [ ] Preview deployments use a separate database branch and protection.
- [ ] Each helper has their own account; nobody shares logins.
- [ ] CI is green on `main` (lint, types, unit tests, audit, bundle scan, e2e).

## Updating

1. Merge to `main` (CI must pass).
2. If the release adds migrations, run `pnpm db:migrate` against the direct
   connection string **before** or right after the deploy finishes. Migrations
   in this repo only add tables and columns or relax constraints, so the old
   code keeps working while they run.
3. Vercel deploys `main` automatically. To roll back, use **Instant Rollback**
   on the previous deployment; migrations stay, which is safe for the reason
   above.
