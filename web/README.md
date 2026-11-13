# Ableway web

Accessible AI learning and jobs platform for blind and visually impaired learners.
Next.js App Router, TypeScript strict, pnpm.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in real values
pnpm env:check               # checks .env.local without starting the server
pnpm db:migrate              # applies ./drizzle migrations to DATABASE_URL
pnpm db:seed                 # optional: sample courses, jobs, fake people
pnpm dev
```

The server will not start if an env variable is missing or invalid. It prints which
variables are wrong, but never their values.

## Scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Dev server on http://localhost:3000                   |
| `pnpm lint`         | ESLint (Next, TypeScript, jsx-a11y strict, Prettier)  |
| `pnpm format:check` | Prettier check (`pnpm format` to fix)                 |
| `pnpm typecheck`    | Generate route types, then `tsc --noEmit`             |
| `pnpm test`         | Vitest unit tests (`tests/unit`)                      |
| `pnpm test:e2e`     | Playwright tests (`tests/e2e`), starts its own server |
| `pnpm db:generate`  | New migration from `lib/db/schema.ts` changes         |
| `pnpm db:migrate`   | Apply migrations to `DATABASE_URL`                    |
| `pnpm db:seed`      | Add sample data (safe to re-run)                      |
| `pnpm env:check`    | Validate `.env.local`, or a file: `pnpm env:check f`  |

First time running e2e tests: `pnpm exec playwright install chromium`.

## Layout

- `app/` routes. `app/api/health` is the liveness check.
- `lib/` server code: `assistant`, `knowledge`, `speech`, `telegram`, `jobs`, `alerts`, `auth`, `db`.
  `lib/env.ts` is the only place that reads `process.env`.
- `components/` shared React components.
- `tests/unit`, `tests/e2e`.
- `scripts/` command-line helpers.

## Secrets

`lib/env.ts` imports `server-only`, so the build fails if client code imports it.
ESLint blocks it in `components/`, and `tests/unit/secrets-boundary.test.ts` checks that no
`"use client"` file imports it or reads `process.env`. Never give a secret a `NEXT_PUBLIC_` prefix.
