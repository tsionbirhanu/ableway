import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { alertSubscriptions } from "@/lib/db/schema";
import { BadRequestError, withErrors } from "@/lib/auth/errors";
import { requireActor } from "@/lib/auth/session";

const schema = z.object({ keywords: z.array(z.string()).default([]), location: z.string().nullable().optional(), jobType: z.enum(["full_time", "part_time", "contract", "internship", "volunteer"]).nullable().optional(), channel: z.enum(["telegram", "sms"]).default("telegram") });

export const GET = withErrors(async () => {
  const actor = await requireActor();
  return Response.json({ subscriptions: await getDb().select().from(alertSubscriptions).where(eq(alertSubscriptions.profileId, actor.id)) });
});

export const POST = withErrors(async (request: Request) => {
  const actor = await requireActor();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) throw new BadRequestError();
  const [subscription] = await getDb().insert(alertSubscriptions).values({ ...parsed.data, profileId: actor.id }).returning();
  return Response.json({ subscription }, { status: 201 });
});

export const PATCH = withErrors(async (request: Request) => {
  const actor = await requireActor();
  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) throw new BadRequestError();
  const [subscription] = await getDb().update(alertSubscriptions).set({ active: parsed.data.active }).where(and(eq(alertSubscriptions.id, parsed.data.id), eq(alertSubscriptions.profileId, actor.id))).returning();
  return Response.json({ subscription: subscription ?? null });
});

export const DELETE = withErrors(async (request: Request) => {
  const actor = await requireActor();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new BadRequestError();
  await getDb().delete(alertSubscriptions).where(and(eq(alertSubscriptions.id, id), eq(alertSubscriptions.profileId, actor.id)));
  return new Response(null, { status: 204 });
});
