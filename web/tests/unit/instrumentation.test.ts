import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvError, resetEnvCacheForTests } from "@/lib/env";
import { register } from "@/instrumentation";

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCacheForTests();
});

describe("instrumentation register", () => {
  it("fails startup on the Node runtime when env is invalid", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("DATABASE_URL", "");
    await expect(register()).rejects.toBeInstanceOf(EnvError);
  });

  it("skips env checks on other runtimes", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("DATABASE_URL", "");
    await expect(register()).resolves.toBeUndefined();
  });
});
