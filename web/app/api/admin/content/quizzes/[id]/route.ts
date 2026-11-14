import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { quizQuestions, quizzes } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const questionInputSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().min(1),
  prompt: z.string().trim().min(1),
  choices: z.array(z.string().trim().min(1)).min(2).max(6),
  correctChoice: z.number().int().min(0),
  explanation: z.string().trim().min(1),
});

const updateQuizSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  passMark: z.number().int().min(0).max(100).optional(),
  status: z.enum(["draft", "published"]).optional(),
  lessonId: z.string().uuid().optional().nullable(),
  questions: z.array(questionInputSchema).optional(),
});

export const GET = withErrors(async (_request: Request, props: RouteProps) => {
  await requireRole(["content_manager", "admin"]);
  const { id } = await props.params;
  const db = getDb();

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
  if (!quiz) throw new NotFoundError("Quiz not found.");

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, id))
    .orderBy(asc(quizQuestions.position));

  return Response.json({
    quiz: {
      ...quiz,
      questions,
    },
  });
});

export const PATCH = withErrors(async (request: Request, props: RouteProps) => {
  await requireRole(["content_manager", "admin"]);
  const { id } = await props.params;
  const body = updateQuizSchema.parse(await readJson(request));
  const db = getDb();

  const [existing] = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
  if (!existing) throw new NotFoundError("Quiz not found.");

  const { questions: newQuestions, ...quizUpdate } = body;

  const [updatedQuiz] = await db
    .update(quizzes)
    .set({
      ...quizUpdate,
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, id))
    .returning();

  if (newQuestions !== undefined) {
    // Delete existing questions and replace with updated ones
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));

    for (const q of newQuestions) {
      await db.insert(quizQuestions).values({
        quizId: id,
        position: q.position,
        prompt: q.prompt,
        choices: q.choices,
        correctChoice: q.correctChoice,
        explanation: q.explanation,
      });
    }
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, id))
    .orderBy(asc(quizQuestions.position));

  return Response.json({
    quiz: {
      ...updatedQuiz,
      questions,
    },
  });
});

export const DELETE = withErrors(async (_request: Request, props: RouteProps) => {
  await requireRole(["content_manager", "admin"]);
  const { id } = await props.params;
  const db = getDb();

  const [deleted] = await db.delete(quizzes).where(eq(quizzes.id, id)).returning();
  if (!deleted) throw new NotFoundError("Quiz not found.");

  return Response.json({ deleted: true });
});
