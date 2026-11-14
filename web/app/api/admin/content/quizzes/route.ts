import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { quizQuestions, quizzes } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

const questionInputSchema = z.object({
  position: z.number().int().min(1),
  prompt: z.string().trim().min(1),
  choices: z.array(z.string().trim().min(1)).min(2).max(6),
  correctChoice: z.number().int().min(0),
  explanation: z.string().trim().min(1),
});

const createQuizSchema = z.object({
  moduleId: z.string().uuid(),
  lessonId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  passMark: z.number().int().min(0).max(100).default(70),
  status: z.enum(["draft", "published"]).default("draft"),
  questions: z.array(questionInputSchema).optional(),
});

export const POST = withErrors(async (request: Request) => {
  await requireRole(["content_manager", "admin"]);
  const body = createQuizSchema.parse(await readJson(request));
  const db = getDb();

  const [quiz] = await db
    .insert(quizzes)
    .values({
      moduleId: body.moduleId,
      lessonId: body.lessonId ?? null,
      title: body.title,
      passMark: body.passMark,
      status: body.status,
    })
    .returning();

  const createdQuestions = [];
  if (body.questions && body.questions.length > 0) {
    for (const q of body.questions) {
      const [question] = await db
        .insert(quizQuestions)
        .values({
          quizId: quiz.id,
          position: q.position,
          prompt: q.prompt,
          choices: q.choices,
          correctChoice: q.correctChoice,
          explanation: q.explanation,
        })
        .returning();
      createdQuestions.push(question);
    }
  }

  return Response.json(
    {
      quiz: {
        ...quiz,
        questions: createdQuestions,
      },
    },
    { status: 201 }
  );
});
