import { eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import { parseId, readJson } from "@/lib/auth/params";
import { canUpdateHelpRequest } from "@/lib/auth/policies";
import { authorize, requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { helpRequests, profiles } from "@/lib/db/schema";

type RouteProps = { params: Promise<{ id: string }> };

const transferSchema = z.strictObject({
  targetHelperId: z.uuid().nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/helper/requests/[id]/transfer
 * Give the request to another helper, or release it back to the queue.
 * The target must be a helper or admin, so a request (and the learner's
 * contact details) can never be handed to a learner account.
 */
export const POST = withApi({}, async (request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  authorize(canUpdateHelpRequest(actor));
  const id = parseId((await props.params).id);
  const body = transferSchema.parse(await readJson(request));
  const targetHelperId = body.targetHelperId ?? null;

  const updated = await getDb().transaction(async (tx) => {
    if (targetHelperId) {
      const [target] = await tx
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, targetHelperId));
      if (!target || (target.role !== "helper" && target.role !== "admin")) {
        throw new BadRequestError("Choose a helper to transfer this request to.");
      }
    }

    const newStatus = targetHelperId ? "assigned" : "waiting";
    const [row] = await tx
      .update(helpRequests)
      .set({ assignedHelperId: targetHelperId, status: newStatus })
      .where(eq(helpRequests.id, id))
      .returning();
    if (!row) throw new NotFoundError("Help request not found.");

    await recordAudit(tx, {
      actorId: actor.id,
      action: "help_request.transferred",
      target: `help_requests:${id}`,
      metadata: { toHelperId: targetHelperId, hasNotes: Boolean(body.notes) },
    });
    return row;
  });

  return Response.json({
    ok: true,
    status: updated.status,
    helpRequest: updated,
    message: targetHelperId
      ? "Help request transferred to designated helper."
      : "Help request released back to queue.",
  });
});
