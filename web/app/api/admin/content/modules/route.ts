import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { modules } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

const createModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().default(""),
  position: z.number().int().min(1),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const POST = withErrors(async (request: Request) => {
  await requireRole(["content_manager", "admin"]);
  const body = createModuleSchema.parse(await readJson(request));
  const db = getDb();

  const [created] = await db
    .insert(modules)
    .values(body)
    .returning();

  return Response.json({ module: created }, { status: 201 });
});

