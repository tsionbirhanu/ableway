import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { PayloadTooLargeError } from "@/lib/auth/errors";
import { readBodyBytes } from "@/lib/auth/params";
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
 * or per IP when signed out. The audio is not stored unless the operator
 * switch is on AND the signed-in learner opted in (see lib/speech/retention.ts).
 */

const languageSchema = z.string().trim().max(10).optional();
// Multipart wrapping adds a little on top of the audio itself.
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

export const POST = withApi(
  { maxBodyBytes: MAX_REQUEST_BYTES, tooLarge: () => new SpeechError("audio_too_large") },
  async (request: Request) => {
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
    const result = await transcribeRecording(getSpeechDeps(), audio, language, {
      profileId: actor?.id ?? null,
    });

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
  },
);

/** Read the body within MAX_REQUEST_BYTES, even if Content-Length is missing or false. */
async function readLimited(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return await readBodyBytes(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) throw new SpeechError("audio_too_large");
    throw error;
  }
}

async function readUpload(request: Request): Promise<{ audio: Uint8Array; language?: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  const queryLanguage = new URL(request.url).searchParams.get("language") ?? undefined;

  if (contentType.includes("multipart/form-data")) {
    const bytes = await readLimited(request);
    let form: FormData;
    try {
      form = await new Response(bytes, { headers: { "content-type": contentType } }).formData();
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
    const audio = await readLimited(request);
    if (audio.length > MAX_AUDIO_BYTES) throw new SpeechError("audio_too_large");
    return { audio, language: languageSchema.parse(queryLanguage) };
  }

  throw new SpeechError("unsupported_format");
}
