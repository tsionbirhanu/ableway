import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { canViewUnansweredQuestions } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getDb } from "@/lib/db/client";
import { unansweredQuestions, conversationChannel } from "@/lib/db/schema";

const recordSchema = z.object({
  text: z.string().min(1).max(2000),
  language: z.string().min(2).max(10).optional().default("en"),
  channel: z.enum(conversationChannel.enumValues).optional().default("web"),
});

export const GET = withErrors(async (request: Request) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));

  const url = new URL(request.url);
  const resolvedParam = url.searchParams.get("resolved");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  const db = getDb();
  const conditions = [];

  if (resolvedParam === "true") {
    conditions.push(eq(unansweredQuestions.resolved, true));
  } else if (resolvedParam === "false" || !resolvedParam) {
    // Default to unresolved questions so staff see what needs answering
    conditions.push(eq(unansweredQuestions.resolved, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(unansweredQuestions)
    .where(whereClause);

  const questions = await db
    .select()
    .from(unansweredQuestions)
    .where(whereClause)
    .orderBy(desc(unansweredQuestions.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({
    questions,
    total: Number(totalRes?.count ?? 0),
    limit,
    offset,
  });
});

export const POST = withErrors(async (request: Request) => {
  const body = recordSchema.parse(await readJson(request));
  const db = getDb();

  const [created] = await db
    .insert(unansweredQuestions)
    .values({
      text: body.text,
      language: body.language,
      channel: body.channel,
      resolved: false,
    })
    .returning();

  return Response.json({ question: created }, { status: 201 });
});

