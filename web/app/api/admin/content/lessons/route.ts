import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";
import { assertLessonPublishChecklist } from "@/lib/learn/checklist";

const createLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  transcript: z.string().default(""),
  audioUrl: z.string().url().startsWith("https://").optional().nullable(),
  durationSeconds: z.number().int().min(0).optional().nullable(),
  position: z.number().int().min(1),
  status: z.enum(["draft", "published"]).default("draft"),
  imageDescriptions: z.record(z.string(), z.string()).optional(),
});

export const POST = withErrors(async (request: Request) => {
  await requireRole(["content_manager", "admin"]);
  const body = createLessonSchema.parse(await readJson(request));
  const db = getDb();

  // Enforce publish checklist
  if (body.status === "published") {
    assertLessonPublishChecklist({
      title: body.title,
      transcript: body.transcript,
      audioUrl: body.audioUrl,
      status: "published",
      imageDescriptions: body.imageDescriptions,
    });
  }

  const { imageDescriptions, ...lessonData } = body;

  const [created] = await db
    .insert(lessons)
    .values({
      ...lessonData,
      audioUrl: lessonData.audioUrl ?? null,
      durationSeconds: lessonData.durationSeconds ?? null,
    })
    .returning();

  return Response.json({ lesson: created }, { status: 201 });
});

