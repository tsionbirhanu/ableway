import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { verifyPasswordLogin } from "./accounts";
import { RateLimitError } from "./errors";
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

/**
 * Auth.js: email and password only. JWT sessions, so no session table.
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
