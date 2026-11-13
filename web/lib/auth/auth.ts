import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { verifyPasswordLogin } from "./accounts";
import { ConflictError, RateLimitError } from "./errors";
import { finishPasskeyRegistration, finishPasskeySignIn, relyingPartyFromAppUrl } from "./passkeys";
import { clientIp } from "./request-ip";
import { isRole, type Role } from "./roles";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; name?: string | null; email?: string | null };
  }
  interface User {
    role?: Role;
  }
}

/** Shown on the sign-in page as ?code=rate_limited. Never reveals which part was wrong. */
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

/** Someone created an account with this email while the passkey was being made. */
class EmailTaken extends CredentialsSignin {
  code = "email_taken";
}

/** Passkey credentials arrive as form strings: { mode, challengeId, response (JSON) }. */
const passkeyCredentialsSchema = z.object({
  mode: z.enum(["register", "authenticate"]),
  challengeId: z.string(),
  response: z.string().max(20_000),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Auth.js: passkeys (main) and email + password (fallback). JWT sessions, so no session table.
 * The role is in the session for the UI. Route handlers and server actions
 * re-read the role from the database (see session.ts), so a role change
 * takes effect on the next request.
 *
 * Lazy config: env is read on first use, not at import time.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getEnv();
  return {
    secret: env.AUTH_SECRET,
    // Hosts like Vercel set the forwarded host. Self-hosting: run behind a proxy you control.
    trustHost: true,
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    pages: { signIn: "/sign-in", error: "/sign-in" },
    providers: [
      Credentials({
        id: "password",
        name: "Email and password",
        credentials: { email: { type: "email" }, password: { type: "password" } },
        async authorize(credentials, request) {
          try {
            const actor = await verifyPasswordLogin(getDb(), credentials, {
              ip: clientIp(request.headers),
            });
            return actor ? { id: actor.id, role: actor.role } : null;
          } catch (error) {
            if (error instanceof RateLimitError) throw new TooManyAttempts();
            throw error;
          }
        },
      }),
      Credentials({
        id: "passkey",
        name: "Passkey",
        credentials: { mode: {}, challengeId: {}, response: {} },
        async authorize(credentials, request) {
          const parsed = passkeyCredentialsSchema.safeParse(credentials);
          if (!parsed.success) return null;
          const input = {
            challengeId: parsed.data.challengeId,
            response: parseJson(parsed.data.response),
          };
          const options = {
            ip: clientIp(request.headers),
            rp: relyingPartyFromAppUrl(env.APP_URL),
          };
          try {
            const actor =
              parsed.data.mode === "register"
                ? await finishPasskeyRegistration(getDb(), input, options)
                : await finishPasskeySignIn(getDb(), input, options);
            return actor ? { id: actor.id, role: actor.role } : null;
          } catch (error) {
            if (error instanceof RateLimitError) throw new TooManyAttempts();
            if (error instanceof ConflictError) throw new EmailTaken();
            throw error;
          }
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user?.id) {
          token.sub = user.id;
          token.role = user.role;
        }
        return token;
      },
      session({ session, token }) {
        if (token.sub && isRole(token.role)) {
          session.user = { ...session.user, id: token.sub, role: token.role };
        }
        return session;
      },
    },
  };
});
