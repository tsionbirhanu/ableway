import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { enforce, hashKeyPart, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request-ip";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getSpeechDeps } from "@/lib/speech";
import { MAX_RATE, MAX_TTS_CHARS, MIN_RATE, synthesizeSpeech } from "@/lib/speech/service";
import { SpeechError } from "@/lib/speech/types";

/**
 * POST /api/speech/synthesize
 *
 * Body: { text, language?, voice?, rate? }. Text up to 1,500 characters.
 * Returns audio (audio/mpeg from Azure, audio/wav from the mock).
 * Repeated phrases come from a cache (header X-Speech-Cache: hit or miss).
 * Errors: { error: { code, message } }, where message can be read aloud.
 */

const body = z.object({
  text: z.string().max(MAX_TTS_CHARS * 2),
  language: z.string().trim().max(10).optional(),
  voice: z.string().trim().max(64).optional(),
  rate: z.number().min(MIN_RATE).max(MAX_RATE).optional(),
});

export const POST = withErrors(async (request: Request) => {
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.path[0] === "text" && i.code === "too_big");
    throw tooLong
      ? new SpeechError("text_too_long")
      : new SpeechError("no_audio", "Please send the text to read, as { text }.");
  }

  const actor = await getActor();
  await enforce(getDb(), [
    {
      key: actor
        ? `speech-tts:user:${actor.id}`
        : `speech-tts:ip:${hashKeyPart(clientIp(request.headers))}`,
      limit: LIMITS.speechSynthesize,
    },
  ]);

  const deps = getSpeechDeps();
  const result = await synthesizeSpeech(deps, parsed.data);
  return new Response(Buffer.from(result.audio), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Length": String(result.audio.length),
      // Private: the text may be personal (for example, a name being read back).
      "Cache-Control": "private, max-age=3600",
      "X-Speech-Cache": result.cached ? "hit" : "miss",
      // "mock" audio is silent: the browser player then uses its own voice instead.
      "X-Speech-Provider": deps.providerName,
    },
  });
});
