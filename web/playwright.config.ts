import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Fake values so the dev server can start in tests and CI.
 * None of these are real secrets.
 */
const testEnv = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/ableway_test",
  AUTH_SECRET: "test-auth-secret-at-least-32-characters-long",
  GEMINI_API_KEY: "test-gemini-key",
  STT_API_KEY: "test-stt-key",
  TTS_API_KEY: "test-tts-key",
  TELEGRAM_BOT_TOKEN: "123456789:TEST_TOKEN_abcdefghijklmnopqrstuvwxyz",
  TELEGRAM_WEBHOOK_SECRET: "test_webhook_secret_1234",
  CRON_SECRET: "test-cron-secret-1234",
  APP_URL: `http://localhost:${PORT}`,
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: testEnv,
  },
});
