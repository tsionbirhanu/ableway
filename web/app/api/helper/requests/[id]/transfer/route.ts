import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { auditLog, helpRequests } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const transferSchema = z.object({
  targetHelperId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/helper/requests/[id]/transfer
 * Transfers the help request to another helper or releases it back to the waiting queue.
 */
export const POST = withErrors(async (request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  const { id } = await props.params;
  const body = transferSchema.parse(await readJson(request));
  const db = getDb();

  const [helpReq] = await db
    .select()
    .from(helpRequests)
    .where(eq(helpRequests.id, id))
    .limit(1);

  if (!helpReq) {
    throw new NotFoundError("Help request not found.");
  }

  const newStatus = body.targetHelperId ? "assigned" : "waiting";

  const [updated] = await db
    .update(helpRequests)
    .set({
      assignedHelperId: body.targetHelperId ?? null,
      status: newStatus,
    })
    .where(eq(helpRequests.id, id))
    .returning();

  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "help_request.transferred",
    target: `help_requests:${id}`,
    metadata: {
      fromHelperId: actor.id,
      toHelperId: body.targetHelperId ?? null,
      notes: body.notes ?? null,
    },
  });

  return Response.json({
    ok: true,
    status: newStatus,
    helpRequest: updated,
    message: body.targetHelperId
      ? "Help request transferred to designated helper."
      : "Help request released back to queue.",
  });
});

