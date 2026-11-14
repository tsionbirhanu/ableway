import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { languageTag } from "@/lib/api/schemas";
import { readJson } from "@/lib/auth/params";

/**
 * Save display preferences in cookies, so the first render already uses the
 * learner's theme and text size. Every value is checked against a fixed list
 * before it is written to a cookie.
 */
const preferences = z.strictObject({
  interactionMode: z.enum(["voice-first", "screen-reader", "hybrid"]).optional(),
  suppressInAppTTS: z.boolean().optional(),
  speechRate: z.number().min(0.5).max(2).optional(),
  speechPitch: z.number().min(0.5).max(1.5).optional(),
  speechVolume: z.number().min(0).max(1).optional(),
  selectedVoice: z.string().trim().max(200).nullable().optional(),
  contrastTheme: z.enum(["default", "high-contrast", "dark-contrast", "yellow-black"]).optional(),
  textSize: z.enum(["normal", "large", "x-large", "xx-large"]).optional(),
  reducedMotion: z.boolean().optional(),
  earconsEnabled: z.boolean().optional(),
  language: languageTag.optional(),
});

const YEAR = 60 * 60 * 24 * 365;

export const POST = withApi({}, async (request: Request) => {
  const prefs = preferences.parse(await readJson(request));
  const secure = new URL(request.url).protocol === "https:";
  const cookie = (name: string, value: string) =>
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${YEAR}; SameSite=Lax${secure ? "; Secure" : ""}`;

  const response = Response.json({
    success: true,
    preferences: prefs,
    message: "Accessibility settings saved successfully.",
  });
  if (prefs.contrastTheme)
    response.headers.append("Set-Cookie", cookie("ableway_theme", prefs.contrastTheme));
  if (prefs.textSize)
    response.headers.append("Set-Cookie", cookie("ableway_text_size", prefs.textSize));
  if (prefs.language) {
    response.headers.append("Set-Cookie", cookie("ableway_lang", prefs.language.slice(0, 2)));
  }
  return response;
});
