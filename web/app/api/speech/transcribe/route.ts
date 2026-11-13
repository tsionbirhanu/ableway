import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { enforce, hashKeyPart, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request-ip";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { MAX_AUDIO_BYTES } from "@/lib/speech/audio";
import { getSpeechDeps } from "@/lib/speech";
import { transcribeRecording } from "@/lib/speech/service";
import { SpeechError } from "@/lib/speech/types";

/**
 * POST /api/speech/transcribe
 *
 * Body: multipart form with `audio` (or `file`) and optional `language`,
 * or the raw recording with an audio/* Content-Type and ?language=am.
 * Formats: webm, ogg, wav. Max 60 seconds and 10 MB.
 *
 * Returns { text, transcript, language, confidence, lowConfidence, seconds }.
 * `transcript` repeats `text` for the assistant panel, which reads that name.
 * Errors: { error: { code, message } }, where message can be read aloud.
 *
 * Works before sign-in (voice registration). Rate limited per learner,
 * or per IP when signed out. The audio is not stored (see lib/speech/retention.ts).
 */

const languageSchema = z.string().trim().max(10).optional();
// Multipart wrapping adds a little on top of the audio itself.
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

export const POST = withErrors(async (request: Request) => {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_REQUEST_BYTES) throw new SpeechError("audio_too_large");

  const actor = await getActor();
  await enforce(getDb(), [
    {
      key: actor
        ? `speech-stt:user:${actor.id}`
        : `speech-stt:ip:${hashKeyPart(clientIp(request.headers))}`,
      limit: LIMITS.speechTranscribe,
    },
  ]);

  const { audio, language } = await readUpload(request);
  const result = await transcribeRecording(getSpeechDeps(), audio, language);

  return Response.json(
    {
      text: result.text,
      transcript: result.text,
      language: result.language,
      confidence: result.confidence,
      lowConfidence: result.lowConfidence,
      seconds: Math.round(result.seconds * 10) / 10,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});

async function readUpload(request: Request): Promise<{ audio: Uint8Array; language?: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  const queryLanguage = new URL(request.url).searchParams.get("language") ?? undefined;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new SpeechError("no_audio");
    }
    const file = form.get("audio") ?? form.get("file");
    if (!(file instanceof Blob)) throw new SpeechError("no_audio");
    if (file.size > MAX_AUDIO_BYTES) throw new SpeechError("audio_too_large");
    const formLanguage = form.get("language");
    return {
      audio: new Uint8Array(await file.arrayBuffer()),
      language: languageSchema.parse(
        typeof formLanguage === "string" ? formLanguage : queryLanguage,
      ),
    };
  }

  if (contentType.startsWith("audio/") || contentType === "application/octet-stream") {
    const audio = new Uint8Array(await request.arrayBuffer());
    if (audio.length > MAX_AUDIO_BYTES) throw new SpeechError("audio_too_large");
    return { audio, language: languageSchema.parse(queryLanguage) };
  }

  throw new SpeechError("unsupported_format");
}
