import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { createLearnerHelpRequest } from "@/lib/help-requests";

const helpSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  type: z.enum(["payment", "general", "technical", "telegram", "urgent"]).default("general"),
  channel: z.enum(["web", "telegram", "phone", "sms"]).default("web"),
  page: z.string().trim().max(300).startsWith("/").optional(),
});

export const POST = withErrors(async (request: Request) => {
  const body = helpSchema.parse(await readJson(request));
  const created = await createLearnerHelpRequest(request, body);
  return Response.json(
    {
      id: created.id,
      status: created.status,
      message: "A human helper has been notified and will assist you shortly.",
    },
    { status: 201 }
  );
});

