import { eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId } from "@/lib/auth/params";
import { canViewHelpRequest } from "@/lib/auth/policies";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { helpRequests, profiles } from "@/lib/db/schema";

type RouteProps = { params: Promise<{ id: string }> };

/**
 * GET /api/help/[id]/status: progress of a help request, for the page that
 * is waiting for a helper. Supports SSE (Accept: text/event-stream) and polling.
 *
 * Anyone holding the (random, unguessable) id sees only the status, so a
 * signed-out learner can still watch their own request. The reason, the
 * assistant's summary and the helper's name are shown only to people allowed
 * to view the request: its learner, helpers and admins.
 */
export const GET = withApi({}, async (request: Request, props: RouteProps) => {
  const id = parseId((await props.params).id);

  const [row] = await getDb()
    .select({
      id: helpRequests.id,
      profileId: helpRequests.profileId,
      assignedHelperId: helpRequests.assignedHelperId,
      status: helpRequests.status,
      type: helpRequests.type,
      trigger: helpRequests.trigger,
      reason: helpRequests.reason,
      summary: helpRequests.summary,
      channel: helpRequests.channel,
      page: helpRequests.page,
      createdAt: helpRequests.createdAt,
      helperName: profiles.name,
    })
    .from(helpRequests)
    .leftJoin(profiles, eq(profiles.id, helpRequests.assignedHelperId))
    .where(eq(helpRequests.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Help request not found.");

  const actor = await getActor();
  const status = {
    id: row.id,
    status: row.status,
    helperAssigned: row.assignedHelperId !== null,
    estimatedWaitMinutes: row.status === "waiting" ? 2 : 0,
    createdAt: row.createdAt,
  };
  const payload = canViewHelpRequest(actor, row)
    ? {
        ...status,
        type: row.type,
        trigger: row.trigger,
        reason: row.reason,
        summary: row.summary,
        channel: row.channel,
        page: row.page,
        assignedHelper: row.assignedHelperId
          ? { id: row.assignedHelperId, fullName: row.helperName || "Staff Helper" }
          : null,
      }
    : status;

  const accept = request.headers.get("accept") || "";
  const isSse =
    accept.includes("text/event-stream") ||
    new URL(request.url).searchParams.get("stream") === "true";
  if (!isSse) return Response.json(payload);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
});
