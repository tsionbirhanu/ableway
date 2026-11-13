import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { createLearnerHelpRequest } from "@/lib/help-requests";

/**
 * Older endpoint used by the payment page: { type, summary, channel }.
 * Saves a real help request (same rules as POST /api/help-requests).
 * New code should call /api/help-requests.
 */
const legacyBody = z.object({
  type: z.enum(["payment", "general", "technical", "telegram", "urgent"]).default("general"),
  summary: z.string().trim().min(1).max(500),
  channel: z.enum(["web", "telegram", "phone", "sms"]).default("web"),
});

export const POST = withErrors(async (request: Request) => {
  const { type, summary, channel } = legacyBody.parse(await readJson(request));
  const created = await createLearnerHelpRequest(request, { type, reason: summary, channel });
  return Response.json(
    { id: created.id, status: created.status, message: "A helper will contact you soon." },
    { status: 201 },
  );
});
