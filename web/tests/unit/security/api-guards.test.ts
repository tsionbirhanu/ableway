import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../db/test-db";

/**
 * withApi: CSRF, body size and rate limits, plus a static check that every
 * API route goes through it with strict input validation.
 */
const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const { withApi, isCrossSiteRequest } = await import("@/lib/api/handler");
const { readJson } = await import("@/lib/auth/params");
const { setLogSinkForTests } = await import("@/lib/log");

let t: TestDb;
const lines: string[] = [];

beforeAll(async () => {
  t = await createTestDb();
  state.db = t.db;
}, 60_000);
afterAll(async () => {
  await t?.client.close();
});
beforeEach(() => {
  state.db = t.db;
  state.userId = null;
  lines.length = 0;
  setLogSinkForTests((_level, line) => lines.push(line));
});
afterEach(() => setLogSinkForTests());

const echo = withApi({ maxBodyBytes: 100 }, async (request: Request) =>
  Response.json({ got: await readJson(request) }),
);

let ipCounter = 0;
const req = (init: RequestInit & { headers?: Record<string, string> } = {}) =>
  new Request("https://app.test/api/echo", {
    method: "POST",
    ...init,
    headers: {
      "content-type": "application/json",
      "x-real-ip": `10.0.0.${++ipCounter}`,
      ...init.headers,
    },
    body: init.body ?? "{}",
  });

describe("CSRF (same-origin check on state-changing requests)", () => {
  it("allows same-origin browser requests and non-browser clients", async () => {
    expect((await echo(req({ headers: { origin: "https://app.test" } }))).status).toBe(200);
    expect((await echo(req({ headers: { "sec-fetch-site": "same-origin" } }))).status).toBe(200);
    expect((await echo(req())).status).toBe(200);
  });

  it("blocks requests that a browser says came from another site", async () => {
    const fromOrigin = await echo(req({ headers: { origin: "https://evil.example" } }));
    expect(fromOrigin.status).toBe(403);
    const fromFetchSite = await echo(req({ headers: { "sec-fetch-site": "cross-site" } }));
    expect(fromFetchSite.status).toBe(403);
    // A form posted from a sibling subdomain is not same-origin either.
    expect((await echo(req({ headers: { "sec-fetch-site": "same-site" } }))).status).toBe(403);
    expect(lines.some((l) => l.includes("api.csrf_blocked"))).toBe(true);
  });

  it("does not apply to safe methods", () => {
    const get = new Request("https://app.test/api/x", {
      headers: { origin: "https://evil.example" },
    });
    // isCrossSiteRequest reports it, but withApi only checks POST/PUT/PATCH/DELETE.
    expect(isCrossSiteRequest(get)).toBe(true);
  });
});

describe("request size limits", () => {
  it("rejects a declared Content-Length over the limit with 413", async () => {
    const res = await echo(req({ body: JSON.stringify({ a: "x".repeat(200) }) }));
    expect(res.status).toBe(413);
  });

  it("rejects an oversized body even when Content-Length is missing", async () => {
    const big = new TextEncoder().encode(JSON.stringify({ a: "x".repeat(500) }));
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(big);
        c.close();
      },
    });
    const request = new Request("https://app.test/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "10.9.9.9" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect((await echo(request)).status).toBe(413);
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the per-IP limit is passed", async () => {
    const route = withApi({ rateLimit: "accountDelete" }, async () => Response.json({ ok: true }));
    const call = () =>
      route(
        new Request("https://app.test/api/x", {
          method: "POST",
          headers: { "x-real-ip": "10.1.1.1" },
        }),
      );
    let last: Response | undefined;
    // accountDelete per IP = apiWritePerIp (120 / 5 min)
    for (let i = 0; i < 121; i++) last = await call();
    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("also limits per signed-in user, across IPs", async () => {
    const [p] = await t.db
      .execute<{ id: string }>(
        "insert into profiles (name, role) values ('Limit Learner', 'learner') returning id" as never,
      )
      .then((r) => (r as unknown as { rows: { id: string }[] }).rows);
    state.userId = p!.id;
    const route = withApi({ rateLimit: "export" }, async () => Response.json({ ok: true }));
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await route(
        new Request("https://app.test/api/x", { headers: { "x-real-ip": `10.2.0.${i}` } }),
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it("fails open (and logs) if the counter store is down", async () => {
    state.db = {
      insert: () => {
        throw new Error("connection refused");
      },
    };
    const route = withApi({}, async () => Response.json({ ok: true }));
    const res = await route(new Request("https://app.test/api/x"));
    expect(res.status).toBe(200);
    expect(lines.some((l) => l.includes("api.rate_limit_unavailable"))).toBe(true);
  });
});

describe("errors and caching", () => {
  it("never caches API responses in shared caches", async () => {
    const res = await echo(req());
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a generic 500 and logs without personal data", async () => {
    const route = withApi({}, async () => {
      throw new Error("insert failed for abebe@example.com phone +251911234567");
    });
    const res = await route(new Request("https://app.test/api/x"));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("abebe");
    const logged = lines.join("\n");
    expect(logged).toContain("api.unhandled_error");
    expect(logged).not.toContain("abebe@example.com");
    expect(logged).not.toContain("+251911234567");
  });

  it("turns unknown fields into 400 when a route uses a strict schema", async () => {
    const { z } = await import("zod");
    const route = withApi({}, async (request: Request) =>
      Response.json(z.strictObject({ a: z.string() }).parse(await readJson(request))),
    );
    const res = await route(req({ body: JSON.stringify({ a: "x", cardNumber: "4111" }) }));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------

const root = join(__dirname, "..", "..", "..");
function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return name === "route.ts" ? [path] : [];
  });
}
const routes = routeFiles(join(root, "app", "api"));

describe("every API route", () => {
  it("exists (sanity)", () => {
    expect(routes.length).toBeGreaterThan(35);
  });

  it.each(routes.map((file) => [relative(root, file)]))(
    "%s goes through withApi for every method",
    (file) => {
      const source = readFileSync(join(root, file), "utf8");
      const methods = [
        ...source.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g),
      ];
      expect(methods.length).toBeGreaterThan(0);
      // No bare handlers: each exported method is a withApi(...) wrapper.
      expect(source).not.toMatch(/export async function (GET|POST|PUT|PATCH|DELETE)\b/);
      for (const [, method] of methods) {
        const pattern = new RegExp(`export const ${method} = withApi\\(`);
        const aliased = new RegExp(`export const ${method} = withApi\\(\\{[^}]*\\}, handle\\)`);
        expect(pattern.test(source) || aliased.test(source), `${file} ${method}`).toBe(true);
      }
      expect(source).not.toContain("withErrors");
    },
  );

  it.each(routes.map((file) => [relative(root, file)]))(
    "%s validates input with strict schemas",
    (file) => {
      const source = readFileSync(join(root, file), "utf8");
      // Body or query schemas must reject unknown fields.
      expect(source).not.toMatch(/\bz\.object\(/);
      expect(source).not.toMatch(/\.passthrough\(\)/);
      // Bodies are read through readJson / readBodyBytes (size-limited), never request.json().
      expect(source).not.toMatch(/request\.(json|text|arrayBuffer|formData)\(\)/);
      expect(source).not.toMatch(/req\.json\(\)/);
    },
  );
});
