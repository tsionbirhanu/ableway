// Auth.js endpoints: session, CSRF, sign-in callback, sign-out.
// Sign-in is rate limited inside the provider (lib/auth/accounts.ts).
import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;
