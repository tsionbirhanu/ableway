import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { helpRequests, helpRequestStatus, profiles } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { helpRequestColumns, helpRequestView } from "@/lib/auth/help-request-view";
import { readJson } from "@/lib/auth/params";
import { canListHelpRequests } from "@/lib/auth/policies";
import { authorize, requireRole } from "@/lib/auth/session";
import { createLearnerHelpRequest, helpRequestInput } from "@/lib/help-requests";

const openStatuses = ["waiting", "assigned", "in_progress", "callback"] as const;

const listQuery = z.object({
  status: z.enum(helpRequestStatus.enumValues).optional(),
});

/** The help queue: open requests, oldest first. Helpers and admins only. */
export const GET = withErrors(async (request: Request) => {
  const actor = await requireRole(["helper", "admin"]);
  authorize(canListHelpRequests(actor));

  const { status } = listQuery.parse(Object.fromEntries(new URL(request.url).searchParams));

  const rows = await getDb()
    .select(helpRequestColumns)
    .from(helpRequests)
    .leftJoin(profiles, eq(profiles.id, helpRequests.profileId))
    .where(
      status ? eq(helpRequests.status, status) : inArray(helpRequests.status, [...openStatuses]),
    )
    .orderBy(asc(helpRequests.createdAt))
    .limit(200);

  return Response.json({ helpRequests: rows.map((row) => helpRequestView(actor, row)) });
});

/**
 * Ask for a human helper. Works before sign-in too, because people often
 * need help most when they cannot sign in. Rate limited per IP.
 */
export const POST = withErrors(async (request: Request) => {
  const input = helpRequestInput.parse(await readJson(request));
  const created = await createLearnerHelpRequest(request, input);

  return Response.json(
    { helpRequest: created, message: "We have asked a helper to contact you. Please wait." },
    { status: 201 },
  );
});
