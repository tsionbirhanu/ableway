import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { helpRequests, profiles } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/help/[id]/status: returns the status of a help request for the learner.
 * Supports SSE streaming (Accept: text/event-stream) and JSON polling.
 */
export const GET = withErrors(async (request: Request, props: RouteProps) => {
  const { id } = await props.params;
  const db = getDb();

  const [row] = await db
    .select({
      id: helpRequests.id,
      status: helpRequests.status,
      type: helpRequests.type,
      trigger: helpRequests.trigger,
      reason: helpRequests.reason,
      summary: helpRequests.summary,
      channel: helpRequests.channel,
      page: helpRequests.page,
      createdAt: helpRequests.createdAt,
      helperId: profiles.id,
      helperName: profiles.name,
    })
    .from(helpRequests)
    .leftJoin(profiles, eq(profiles.id, helpRequests.assignedHelperId))
    .where(eq(helpRequests.id, id))
    .limit(1);

  if (!row) {
    throw new NotFoundError("Help request not found.");
  }

  const payload = {
    id: row.id,
    status: row.status,
    type: row.type,
    trigger: row.trigger,
    reason: row.reason,
    summary: row.summary,
    channel: row.channel,
    page: row.page,
    assignedHelper: row.helperId
      ? { id: row.helperId, fullName: row.helperName || "Staff Helper" }
      : null,
    estimatedWaitMinutes: row.status === "waiting" ? 2 : 0,
    createdAt: row.createdAt,
  };

  const accept = request.headers.get("accept") || "";
  const isSse = accept.includes("text/event-stream") || new URL(request.url).searchParams.get("stream") === "true";

  if (isSse) {
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
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return Response.json(payload);
});

