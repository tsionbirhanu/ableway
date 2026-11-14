import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { languageTag, queryInt } from "@/lib/api/schemas";
import { parseQuery, readJson } from "@/lib/auth/params";
import { canViewUnansweredQuestions } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { conversationChannel, unansweredQuestions } from "@/lib/db/schema";

const recordSchema = z.strictObject({
  text: z.string().trim().min(1).max(2000),
  language: languageTag.default("en"),
  channel: z.enum(conversationChannel.enumValues).default("web"),
});

const listQuery = z.strictObject({
  resolved: z.enum(["true", "false"]).default("false"),
  limit: queryInt(1, 100, 50),
  offset: queryInt(0, 100_000, 0),
});

/** Questions the assistant could not answer. Content managers and admins only. */
export const GET = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));
  const q = parseQuery(request, listQuery);
  const whereClause = eq(unansweredQuestions.resolved, q.resolved === "true");

  const db = getDb();
  const [totalRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(unansweredQuestions)
    .where(whereClause);
  const questions = await db
    .select()
    .from(unansweredQuestions)
    .where(whereClause)
    .orderBy(desc(unansweredQuestions.createdAt))
    .limit(q.limit)
    .offset(q.offset);

  return Response.json({
    questions,
    total: Number(totalRes?.count ?? 0),
    limit: q.limit,
    offset: q.offset,
  });
});

/**
 * Add a question by hand (for example, one a helper heard on the phone).
 * The assistant records its own unanswered questions directly, not through
 * this route. Staff only, so the public cannot fill the list with spam.
 */
export const POST = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));
  const body = recordSchema.parse(await readJson(request));
  const [created] = await getDb()
    .insert(unansweredQuestions)
    .values({ ...body, resolved: false })
    .returning();
  return Response.json({ question: created }, { status: 201 });
});
