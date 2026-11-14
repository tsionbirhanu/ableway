import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { modules } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/auth/errors";
import { withApi } from "@/lib/api/handler";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const updateModuleSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  position: z.number().int().min(1).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const PATCH = withApi({}, async (request: Request, props: RouteProps) => {
  await requireRole(["content_manager", "admin"]);
  const { id } = await props.params;
  const body = updateModuleSchema.parse(await readJson(request));
  const db = getDb();

  const [existing] = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  if (!existing) throw new NotFoundError("Module not found.");

  const [updated] = await db
    .update(modules)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(modules.id, id))
    .returning();

  return Response.json({ module: updated });
});
