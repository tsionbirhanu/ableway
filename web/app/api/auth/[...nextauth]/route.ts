import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { handlers } from "@/lib/auth/auth";

/**
 * Auth.js endpoints: session, CSRF token, sign-in callback, sign-out.
 * Auth.js checks its own double-submit CSRF token on every POST; withApi
 * adds the same-origin check, a body limit and a rate limit. Credential
 * guesses are also limited per email and per IP in lib/auth/accounts.ts.
 */
export const GET = withApi({}, (request: NextRequest) => handlers.GET(request));
export const POST = withApi({ maxBodyBytes: 32 * 1024 }, (request: NextRequest) =>
  handlers.POST(request),
);
