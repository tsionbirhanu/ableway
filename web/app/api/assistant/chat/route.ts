import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { appPath, languageTag } from "@/lib/api/schemas";
import { readJson } from "@/lib/auth/params";
import { replyTo } from "@/lib/assistant/keyword-replies";

/** Keyword assistant (no model). Input is untrusted and validated; see lib/assistant/keyword-replies.ts. */
const body = z.strictObject({
  message: z.string().max(2000),
  currentPage: appPath.optional(),
  language: languageTag.default("en"),
});

export const POST = withApi({ rateLimit: "assistant" }, async (request: Request) => {
  const { message, language } = body.parse(await readJson(request));
  return Response.json(replyTo(message, language));
});
