import { eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId, readJson } from "@/lib/auth/params";
import { canChangeRole } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { profileRole, profiles } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

const body = z.strictObject({ role: z.enum(profileRole.enumValues) });

/**
 * Change someone's role. Admins only, never their own role (so the last admin
 * cannot lock everyone out). The change takes effect on that person's next
 * request, because roles are read from the database every time.
 * Every change is written to the audit log with the old and new role.
 */
export const PATCH = withApi({}, async (request: Request, context: RouteContext) => {
  const actor = await requireActor();
  const id = parseId((await context.params).id);
  authorize(canChangeRole(actor, id));
  const { role } = body.parse(await readJson(request));

  const result = await getDb().transaction(async (tx) => {
    const [current] = await tx
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, id))
      .for("update");
    if (!current) throw new NotFoundError();
    if (current.role === role) return { id, role, changed: false };

    await tx.update(profiles).set({ role }).where(eq(profiles.id, id));
    await recordAudit(tx, {
      actorId: actor.id,
      action: "role.changed",
      target: `profiles:${id}`,
      metadata: { from: current.role, to: role },
    });
    return { id, role, changed: true };
  });

  return Response.json({ profile: result });
});
