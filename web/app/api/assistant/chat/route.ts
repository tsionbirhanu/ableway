import { z } from "zod";
import { replyTo } from "@/lib/assistant/keyword-replies";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";

/** Web assistant chat. Input is untrusted and validated; see lib/assistant/keyword-replies.ts. */
const body = z.object({
  message: z.string().max(2000),
  currentPage: z.string().max(300).optional(),
  language: z.string().min(2).max(10).default("en"),
});

export const POST = withErrors(async (request: Request) => {
  const { message, language } = body.parse(await readJson(request));
  return Response.json(replyTo(message, language));
});
