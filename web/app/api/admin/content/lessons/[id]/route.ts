import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";
import { assertLessonPublishChecklist } from "@/lib/learn/checklist";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const updateLessonSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  transcript: z.string().optional(),
  audioUrl: z.string().url().startsWith("https://").optional().nullable(),
  durationSeconds: z.number().int().min(0).optional().nullable(),
  position: z.number().int().min(1).optional(),
  status: z.enum(["draft", "published"]).optional(),
  imageDescriptions: z.record(z.string(), z.string()).optional(),
});

export const PATCH = withErrors(async (request: Request, props: RouteProps) => {
  await requireRole(["content_manager", "admin"]);
  const { id } = await props.params;
  const body = updateLessonSchema.parse(await readJson(request));
  const db = getDb();

  const [existing] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!existing) throw new NotFoundError("Lesson not found.");

  const targetStatus = body.status ?? existing.status;
  const targetTranscript = body.transcript ?? existing.transcript;
  const targetAudio = body.audioUrl !== undefined ? body.audioUrl : existing.audioUrl;
  const targetTitle = body.title ?? existing.title;

  // Enforce publish checklist whenever status is published
  if (targetStatus === "published") {
    assertLessonPublishChecklist({
      title: targetTitle,
      transcript: targetTranscript,
      audioUrl: targetAudio,
      status: "published",
      imageDescriptions: body.imageDescriptions,
    });
  }

  const { imageDescriptions, ...updateData } = body;

  const [updated] = await db
    .update(lessons)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, id))
    .returning();

  return Response.json({ lesson: updated });
});
