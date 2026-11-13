import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  helpChannel,
  helpRequests,
  helpRequestStatus,
  helpRequestType,
  profiles,
} from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { helpRequestColumns, helpRequestView } from "@/lib/auth/help-request-view";
import { canCreateHelpRequest, canListHelpRequests } from "@/lib/auth/policies";
import { enforce, hashKeyPart, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request-ip";
import { authorize, getActor, requireRole } from "@/lib/auth/session";

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

const createBody = z.strictObject({
  type: z.enum(helpRequestType.enumValues).default("general"),
  reason: z.string().trim().min(1).max(500),
  channel: z.enum(helpChannel.enumValues).default("web"),
  page: z.string().trim().max(300).startsWith("/").optional(),
});

/**
 * Ask for a human helper. Works before sign-in too, because people often
 * need help most when they cannot sign in. Rate limited per IP.
 */
export const POST = withErrors(async (request: Request) => {
  const actor = await getActor();
  const body = createBody.parse(await readJson(request));
  const profileId = actor?.id ?? null;
  authorize(canCreateHelpRequest(actor, profileId));

  const db = getDb();
  await enforce(db, [
    { key: `help:ip:${hashKeyPart(clientIp(request.headers))}`, limit: LIMITS.helpRequestPerIp },
  ]);

  const [created] = await db
    .insert(helpRequests)
    .values({ ...body, profileId, trigger: "learner" })
    .returning({ id: helpRequests.id, status: helpRequests.status });

  return Response.json(
    { helpRequest: created, message: "We have asked a helper to contact you. Please wait." },
    { status: 201 },
  );
});
