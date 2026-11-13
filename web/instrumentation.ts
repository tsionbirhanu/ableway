/**
 * Runs once when the Next.js server starts.
 * We validate env here so a bad config stops the server straight away,
 * with a clear list of what is wrong, instead of failing on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/lib/env");
    getEnv();
  }
}
