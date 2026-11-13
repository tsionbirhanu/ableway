import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { helpRequests, profiles } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { requireRole } from "@/lib/auth/session";
import { isHelperAvailable, DEFAULT_HELPER_SCHEDULE } from "@/lib/helper/settings";

const openStatuses = ["waiting", "assigned", "in_progress"] as const;

/**
 * GET /api/helper/queue: lists all open help requests, oldest first.
 * Helpers and admins only.
 * Supports SSE streaming (Accept: text/event-stream) and JSON polling.
 */
export const GET = withErrors(async (request: Request) => {
  await requireRole(["helper", "admin"]);
  const db = getDb();

  const rows = await db
    .select({
      id: helpRequests.id,
      status: helpRequests.status,
      type: helpRequests.type,
      trigger: helpRequests.trigger,
      reason: helpRequests.reason,
      summary: helpRequests.summary,
      channel: helpRequests.channel,
      page: helpRequests.page,
      profileId: helpRequests.profileId,
      assignedHelperId: helpRequests.assignedHelperId,
      createdAt: helpRequests.createdAt,
      learnerName: profiles.name,
      learnerEmail: profiles.email,
    })
    .from(helpRequests)
    .leftJoin(profiles, eq(profiles.id, helpRequests.profileId))
    .where(inArray(helpRequests.status, [...openStatuses]))
    .orderBy(asc(helpRequests.createdAt))
    .limit(100);

  const payload = {
    queue: rows,
    count: rows.length,
    isOperatingHours: isHelperAvailable(),
    timeoutMinutes: DEFAULT_HELPER_SCHEDULE.timeoutMinutes,
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

