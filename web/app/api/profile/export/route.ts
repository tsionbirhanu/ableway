import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { buildPersonalDataExport } from "@/lib/privacy/export";

/**
 * GET /api/profile/export: everything we hold about the signed-in learner,
 * as a JSON download. Rate limited (5 per hour). Each export is audited.
 */
export const GET = withApi({ rateLimit: "export" }, async (_request: Request) => {
  const actor = await requireActor();
  const db = getDb();
  const data = await buildPersonalDataExport(db, actor.id);
  await recordAudit(db, {
    actorId: actor.id,
    action: "data.exported",
    target: `profiles:${actor.id}`,
    metadata: { formatVersion: data.formatVersion },
  });

  const date = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ableway-my-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
