import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";

const bodySchema = z.object({
  text: z.string().min(1).max(5000),
  language: z.string().optional().default("en"),
  rate: z.number().optional().default(1.0),
});

/**
 * Creates a valid minimal PCM WAV buffer (0.1s silence)
 * ensuring browser audio playback decodes cleanly without network external dependencies.
 */
function createMinimalWav(): Uint8Array {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const dataSize = 800;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);

  // "RIFF"
  buffer.set([0x52, 0x49, 0x46, 0x46], 0);
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  buffer.set([0x57, 0x41, 0x56, 0x45], 8);
  // "fmt "
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  // "data"
  buffer.set([0x64, 0x61, 0x74, 0x61], 36);
  view.setUint32(40, dataSize, true);
  buffer.fill(128, 44); // 8-bit unsigned midpoint

  return buffer;
}

export const POST = withErrors(async (request: Request) => {
  const { text } = bodySchema.parse(await readJson(request));

  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    return Response.json({
      success: true,
      text,
      format: "audio/wav",
    });
  }

  const wavData = createMinimalWav();
  return new Response(wavData.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": wavData.byteLength.toString(),
      "Cache-Control": "no-cache",
    },
  });
});

