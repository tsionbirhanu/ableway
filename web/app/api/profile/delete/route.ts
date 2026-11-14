import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { readJson } from "@/lib/auth/params";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { deleteAccount } from "@/lib/privacy/delete-account";

/**
 * Permanently delete the signed-in learner's account: profile, conversations,
 * Telegram link, job alert subscriptions, consents, voice recordings and the
 * rest (see lib/privacy/delete-account.ts). The page asks for confirmation
 * first and sends { confirm: true }.
 *
 * DELETE is the main method; POST is accepted for older clients.
 * The session cookie is cleared, and the old session stops working anyway
 * because every request re-reads the profile from the database.
 */
const body = z.strictObject({ confirm: z.literal(true) });

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
];

async function handle(request: Request): Promise<Response> {
  const actor = await requireActor();
  body.parse(await readJson(request));
  const deleted = await deleteAccount(getDb(), actor.id, actor.id);

  const response = Response.json({
    ok: true,
    deleted,
    message: "Your account and personal data have been deleted.",
  });
  for (const name of SESSION_COOKIES) {
    const secure = name.startsWith("__") ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
    );
  }
  return response;
}

export const DELETE = withApi({ rateLimit: "accountDelete" }, handle);
export const POST = withApi({ rateLimit: "accountDelete" }, handle);
