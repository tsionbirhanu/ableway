import { afterEach, describe, expect, it, vi } from "vitest";
import { connection } from "next/server";
import { GET } from "@/app/api/health/route";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("returns ok with a timestamp and no caching", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = (await response.json()) as { status: string; time: string };
    expect(body.status).toBe("ok");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it("opts out of prerendering", async () => {
    await GET();
    expect(connection).toHaveBeenCalled();
  });

  it("does not leak env values", async () => {
    vi.stubEnv("GEMINI_API_KEY", "leak-check-value");
    const text = await (await GET()).text();
    expect(text).not.toContain("leak-check-value");
  });
});
