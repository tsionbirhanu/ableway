import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  BadRequestError,
  errorResponse,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  withErrors,
} from "@/lib/auth/errors";
import { helpRequestView } from "@/lib/auth/help-request-view";
import { parseId, readJson } from "@/lib/auth/params";
import { clientIp } from "@/lib/auth/request-ip";
import { isRole, roles } from "@/lib/auth/roles";
import { firstErrors } from "@/app/(auth)/form-state";

describe("errorResponse", () => {
  it.each([
    [new UnauthorizedError(), 401, "unauthorized"],
    [new ForbiddenError(), 403, "forbidden"],
    [new NotFoundError(), 404, "not_found"],
    [new BadRequestError(), 400, "bad_request"],
    [new RateLimitError(30), 429, "rate_limited"],
  ])("maps %s", async (error, status, code) => {
    const res = errorResponse(error);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("maps Zod errors to 400", () => {
    const result = z.string().safeParse(1);
    expect(errorResponse(result.error).status).toBe(400);
  });

  it("hides details of unknown errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("secret db password in message"));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret");
    expect(spy).toHaveBeenCalled();
  });

  it("sets Retry-After on 429", () => {
    expect(errorResponse(new RateLimitError(42)).headers.get("Retry-After")).toBe("42");
  });

  it("withErrors catches thrown errors", async () => {
    const handler = withErrors(async () => {
      throw new ForbiddenError();
    });
    expect((await handler()).status).toBe(403);
  });
});

describe("parseId / readJson", () => {
  it("accepts UUIDs and turns anything else into 404", () => {
    const id = "4f1c2b5e-8a3d-4c7e-9b1a-2d3e4f5a6b7c";
    expect(parseId(id)).toBe(id);
    expect(() => parseId("1; drop table profiles")).toThrow(NotFoundError);
  });

  it("turns bad JSON into 400", async () => {
    await expect(
      readJson(new Request("http://x", { method: "POST", body: "{" })),
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(
      readJson(new Request("http://x", { method: "POST", body: "[1]" })),
    ).resolves.toEqual([1]);
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe(
      "1.1.1.1",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": " 3.3.3.3 , 4.4.4.4" }))).toBe("3.3.3.3");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("roles", () => {
  it("matches the database enum", () => {
    expect(roles).toEqual(["learner", "helper", "admin", "content_manager"]);
    expect(isRole("helper")).toBe(true);
    expect(isRole("superuser")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("helpRequestView", () => {
  const row = {
    id: "r1",
    profileId: "learner-1",
    type: "payment",
    trigger: "assistant",
    reason: "Pay",
    summary: "Summary",
    status: "assigned",
    assignedHelperId: "helper-1",
    channel: "phone",
    page: null,
    createdAt: new Date(),
    learnerName: "L",
    learnerLanguage: "en",
    learnerPhone: "+15555550100",
    learnerEmail: "l@example.org",
  };

  it("includes contact details for the assigned helper only", () => {
    expect(helpRequestView({ id: "helper-1", role: "helper" }, row).contact).toEqual({
      phone: "+15555550100",
      email: "l@example.org",
    });
    const other = helpRequestView({ id: "helper-2", role: "helper" }, row);
    expect(other.contact).toBeNull();
    expect(JSON.stringify(other)).not.toContain("+15555550100");
  });
});

describe("firstErrors", () => {
  it("keeps the first message per field", () => {
    const schema = z.object({
      email: z.string().min(5, "first").max(2, "second"),
      name: z.string(),
    });
    const result = schema.safeParse({ email: "abc", name: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = firstErrors(result.error);
      expect(errors.email).toBe("first");
      expect(errors.name).toBeDefined();
    }
  });
});
