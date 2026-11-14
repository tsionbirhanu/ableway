import { asc, eq, inArray } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { helpRequestColumns, helpRequestView } from "@/lib/auth/help-request-view";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { helpRequests, profiles } from "@/lib/db/schema";
import { DEFAULT_HELPER_SCHEDULE, isHelperAvailable } from "@/lib/helper/settings";

const openStatuses = ["waiting", "assigned", "in_progress"] as const;

/**
 * GET /api/helper/queue: open help requests, oldest first. Helpers and admins only.
 * Contact details appear only on requests assigned to the helper asking (and for admins).
 * Supports SSE (Accept: text/event-stream) and JSON polling.
 */
export const GET = withApi({}, async (request: Request) => {
  const actor = await requireRole(["helper", "admin"]);

  const rows = await getDb()
    .select(helpRequestColumns)
    .from(helpRequests)
    .leftJoin(profiles, eq(profiles.id, helpRequests.profileId))
    .where(inArray(helpRequests.status, [...openStatuses]))
    .orderBy(asc(helpRequests.createdAt))
    .limit(100);

  const queue = rows.map((row) => {
    const view = helpRequestView(actor, row);
    return { ...view, learnerEmail: view.contact?.email ?? null };
  });
  const payload = {
    queue,
    count: queue.length,
    isOperatingHours: isHelperAvailable(),
    timeoutMinutes: DEFAULT_HELPER_SCHEDULE.timeoutMinutes,
  };

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
