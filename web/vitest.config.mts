import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // The real package throws outside React Server Components.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Fixed, fake values so unit tests never read a developer's .env.local
    // (real keys, a real database) and behave the same in CI.
    // Empty means "not set" (lib/env.ts), so features with keys stay off.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/ableway_unit",
      APP_URL: "http://test.local",
      GEMINI_API_KEY: "",
      STT_API_KEY: "",
      TTS_API_KEY: "",
      TELEGRAM_BOT_TOKEN: "",
      SMS_API_KEY: "",
      SPEECH_PROVIDER: "mock",
      SPEECH_RETAIN_AUDIO: "false",
      AZURE_SPEECH_REGION: "",
    },
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    restoreMocks: true,
  },
});
