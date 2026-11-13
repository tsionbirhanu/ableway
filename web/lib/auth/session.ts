import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { auth } from "./auth";
import { ForbiddenError, UnauthorizedError } from "./errors";
import type { Actor, Role } from "./roles";

/**
 * The signed-in person, or null.
 *
 * The session only proves who they are. Their role is read fresh from the
 * database, so demoting a helper takes effect at once, and a deleted
 * profile cannot keep using an old session.
 */
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [profile] = await getDb()
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, id));
  return profile ?? null;
}

/** The signed-in person. Throws UnauthorizedError (401) if nobody is signed in. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  return actor;
}

/**
 * For route handlers: `const actor = await requireRole(["helper", "admin"])`.
 * 401 if nobody is signed in, 403 if their role is not in the list.
 */
export async function requireRole(allowed: readonly Role[]): Promise<Actor> {
  const actor = await requireActor();
  if (!allowed.includes(actor.role)) throw new ForbiddenError();
  return actor;
}

/** Throw 403 unless a policy allows the action. */
export function authorize(allowed: boolean): asserts allowed {
  if (!allowed) throw new ForbiddenError();
}
