import { connection } from "next/server";

/**
 * Liveness check for uptime monitors and deploys.
 * It reports no config or secrets. Env is already checked at startup
 * (see instrumentation.ts), so a running server means env is valid.
 */
export async function GET() {
  // Run at request time, never prerendered at build.
  await connection();
  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
