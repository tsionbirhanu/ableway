import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { parseQuery, readJson } from "@/lib/auth/params";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { alertChannel, alertSubscriptions, jobType } from "@/lib/db/schema";

/** Job alert subscriptions. Learners see and change only their own. */
const createSchema = z.strictObject({
  keywords: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  location: z.string().trim().max(120).nullable().optional(),
  jobType: z.enum(jobType.enumValues).nullable().optional(),
  channel: z.enum(alertChannel.enumValues).default("telegram"),
});
const toggleSchema = z.strictObject({ id: z.uuid(), active: z.boolean() });
const deleteQuery = z.strictObject({ id: z.uuid() });

export const GET = withApi({}, async (_request: Request) => {
  const actor = await requireActor();
  const subscriptions = await getDb()
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.profileId, actor.id));
  return Response.json({ subscriptions });
});

export const POST = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  const input = createSchema.parse(await readJson(request));
  const [subscription] = await getDb()
    .insert(alertSubscriptions)
    .values({ ...input, profileId: actor.id })
    .returning();
  return Response.json({ subscription }, { status: 201 });
});

export const PATCH = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  const { id, active } = toggleSchema.parse(await readJson(request));
  const [subscription] = await getDb()
    .update(alertSubscriptions)
    .set({ active })
    .where(and(eq(alertSubscriptions.id, id), eq(alertSubscriptions.profileId, actor.id)))
    .returning();
  if (!subscription) throw new NotFoundError();
  return Response.json({ subscription });
});

export const DELETE = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  const { id } = parseQuery(request, deleteQuery);
  await getDb().transaction(async (tx) => {
    const [deleted] = await tx
      .delete(alertSubscriptions)
      .where(and(eq(alertSubscriptions.id, id), eq(alertSubscriptions.profileId, actor.id)))
      .returning({ id: alertSubscriptions.id });
    if (!deleted) throw new NotFoundError();
    await recordAudit(tx, {
      actorId: actor.id,
      action: "subscription.deleted",
      target: `alert_subscriptions:${id}`,
    });
  });
  return new Response(null, { status: 204 });
});
