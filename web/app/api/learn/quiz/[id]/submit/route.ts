import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  enrollments,
  modules,
  quizQuestions,
  quizzes,
} from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireActor } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const submitSchema = z.object({
  answers: z.union([
    z.record(z.string(), z.number().int().min(0)),
    z.array(
      z.object({
        questionId: z.string().uuid(),
        selectedChoice: z.number().int().min(0),
      })
    ),
  ]),
});

/**
 * POST /api/learn/quiz/[id]/submit
 * Server-side grading of quiz questions.
 * Never exposes correct answers or explanations until after submission.
 */
export const POST = withErrors(async (request: Request, props: RouteProps) => {
  const actor = await requireActor();
  const { id: quizId } = await props.params;
  const rawBody = await readJson(request);
  const { answers } = submitSchema.parse(rawBody);
  const db = getDb();

  // Load quiz details and its course
  const [quiz] = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      passMark: quizzes.passMark,
      status: quizzes.status,
      moduleId: quizzes.moduleId,
      courseId: modules.courseId,
    })
    .from(quizzes)
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!quiz || quiz.status !== "published") {
    throw new NotFoundError("Quiz not found or not published.");
  }

  // Check enrollment: must be active
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.profileId, actor.id), eq(enrollments.courseId, quiz.courseId)))
    .limit(1);

  if (!enrollment || enrollment.status !== "active") {
    throw new ForbiddenError("Active enrollment required to submit quiz.");
  }

  // Load all quiz questions with correctChoice and explanation from DB
  const questions = await db
    .select({
      id: quizQuestions.id,
      position: quizQuestions.position,
      prompt: quizQuestions.prompt,
      choices: quizQuestions.choices,
      correctChoice: quizQuestions.correctChoice,
      explanation: quizQuestions.explanation,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.position));

  if (questions.length === 0) {
    throw new NotFoundError("This quiz has no questions.");
  }

  // Normalize user answers to map of questionId -> selectedChoice
  const answerMap: Record<string, number> = {};
  if (Array.isArray(answers)) {
    for (const a of answers) {
      answerMap[a.questionId] = a.selectedChoice;
    }
  } else {
    Object.assign(answerMap, answers);
  }

  let correctCount = 0;
  const gradedQuestions = questions.map((q) => {
    const userChoice = answerMap[q.id];
    const isCorrect = userChoice === q.correctChoice;
    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      position: q.position,
      prompt: q.prompt,
      choices: q.choices,
      selectedChoice: userChoice ?? null,
      correctChoice: q.correctChoice,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const scorePercentage = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercentage >= quiz.passMark;

  // Update learner progress in DB
  const currentProgress = enrollment.progress || { completedLessonIds: [], quizResults: {} };
  const currentQuizResults = { ...(currentProgress.quizResults || {}) };
  const prior = currentQuizResults[quiz.id];

  currentQuizResults[quiz.id] = {
    bestScore: Math.max(prior?.bestScore || 0, scorePercentage),
    passed: (prior?.passed || false) || passed,
    attempts: (prior?.attempts || 0) + 1,
  };

  await db
    .update(enrollments)
    .set({
      progress: {
        ...currentProgress,
        quizResults: currentQuizResults,
      },
    })
    .where(eq(enrollments.id, enrollment.id));

  const feedback = passed
    ? `Congratulations! You passed with ${scorePercentage}%.`
    : `You scored ${scorePercentage}%. The passing score is ${quiz.passMark}%. Review the explanations below and try again.`;

  return Response.json({
    quizId: quiz.id,
    quizTitle: quiz.title,
    score: scorePercentage,
    passMark: quiz.passMark,
    passed,
    correctCount,
    totalQuestions: questions.length,
    feedback,
    questions: gradedQuestions,
  });
});

