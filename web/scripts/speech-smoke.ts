/**
 * Manual test against the REAL speech provider, in English and Amharic.
 *
 *   pnpm speech:smoke                         round trip: text -> speech -> text, en + am
 *   pnpm speech:smoke my-voice.webm am        transcribe your own recording (webm/ogg/wav)
 *
 * Needs SPEECH_PROVIDER=gemini (GEMINI_API_KEY) or SPEECH_PROVIDER=azure
 * (STT_API_KEY, TTS_API_KEY, AZURE_SPEECH_REGION) in .env.
 * Writes the audio it makes to .data/speech-smoke/ so you can listen to it.
 * Prints texts and confidence only; never prints keys.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EnvError, parseEnv, type Env } from "../lib/env";
import { toTelegramVoice } from "../lib/speech/audio";
import { AzureSpeechToText, AzureTextToSpeech } from "../lib/speech/providers/azure";
import { GeminiSpeechToText, GeminiTextToSpeech } from "../lib/speech/providers/gemini";
import { synthesizeSpeech, transcribeRecording, type SpeechDeps } from "../lib/speech/service";
import { TtsCache } from "../lib/speech/tts-cache";
import { SpeechError } from "../lib/speech/types";
import { loadEnvFiles } from "./load-env";

const samples = [
  { language: "en", text: "Welcome to Ableway. Would you like to choose a course?" },
  { language: "am", text: "እንኳን ወደ አብልዌይ በደህና መጡ። ኮርስ መምረጥ ይፈልጋሉ?" },
];

function providers(env: Env): Pick<SpeechDeps, "providerName" | "stt" | "tts"> {
  if (env.SPEECH_PROVIDER === "gemini") {
    const key = env.GEMINI_API_KEY!;
    return {
      providerName: "gemini",
      stt: new GeminiSpeechToText({ key }),
      tts: new GeminiTextToSpeech({ key }),
    };
  }
  if (env.SPEECH_PROVIDER === "azure") {
    const region = env.AZURE_SPEECH_REGION!;
    return {
      providerName: "azure",
      stt: new AzureSpeechToText({ key: env.STT_API_KEY!, region }),
      tts: new AzureTextToSpeech({ key: env.TTS_API_KEY!, region }),
    };
  }
  throw new Error("Set SPEECH_PROVIDER=gemini (or azure) in .env to test real speech.");
}

const describeConfidence = (confidence: number | null, low: boolean) =>
  `${confidence === null ? "not given by this provider" : confidence.toFixed(2)}${low ? "  (LOW: would ask to repeat)" : ""}`;

async function main() {
  loadEnvFiles();
  const env = parseEnv(process.env);
  const deps: SpeechDeps = {
    ...providers(env),
    cache: new TtsCache(),
    lowConfidenceThreshold: env.SPEECH_LOW_CONFIDENCE_THRESHOLD,
  };
  console.log(`Provider: ${deps.providerName}`);
  const outDir = join(".data", "speech-smoke");
  await mkdir(outDir, { recursive: true });

  const [file, language = "en"] = process.argv.slice(2);
  if (file) {
    const result = await transcribeRecording(deps, new Uint8Array(await readFile(file)), language);
    console.log(`\n${file} (${language}, ${result.seconds.toFixed(1)} s)`);
    console.log(`  text:       ${result.text}`);
    console.log(`  confidence: ${describeConfidence(result.confidence, result.lowConfidence)}`);
    return;
  }

  for (const { language: lang, text } of samples) {
    console.log(`\n[${lang}] speaking: ${text}`);
    const started = Date.now();
    const speech = await synthesizeSpeech(deps, { text, language: lang });
    const ext = speech.contentType.includes("mpeg") ? "mp3" : "wav";
    const audioFile = join(outDir, `${deps.providerName}-${lang}.${ext}`);
    const voiceNote = await toTelegramVoice(speech.audio);
    await writeFile(audioFile, speech.audio);
    await writeFile(join(outDir, `${deps.providerName}-${lang}-telegram.ogg`), voiceNote);
    console.log(`  saved: ${audioFile} (${speech.audio.length} bytes, ${Date.now() - started} ms)`);

    const again = await synthesizeSpeech(deps, { text, language: lang });
    console.log(`  cache on second request: ${again.cached ? "hit" : "MISS (unexpected)"}`);

    // Round trip through the Telegram format: OGG/Opus voice note -> WAV -> provider -> text.
    const heard = await transcribeRecording(deps, voiceNote, lang);
    console.log(`  heard back: ${heard.text}`);
    console.log(`  confidence: ${describeConfidence(heard.confidence, heard.lowConfidence)}`);
  }
  console.log(`\nDone. Listen to the files in ${outDir}/ to check the voices.`);
}

main().catch((error: unknown) => {
  if (error instanceof EnvError || error instanceof SpeechError) console.error(error.message);
  else console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
