import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const someId = "4f1c2b5e-8a3d-4c7e-9b1a-2d3e4f5a6b7c";

test.describe("protected API routes return 401 without a session", () => {
  for (const [method, path] of [
    ["GET", `/api/enrollments/${someId}`],
    ["GET", `/api/conversations/${someId}/messages`],
    ["GET", "/api/help-requests"],
    ["GET", `/api/help-requests/${someId}`],
    ["POST", "/api/payments/confirm"],
  ] as const) {
    test(`${method} ${path}`, async ({ request }) => {
      const response =
        method === "GET" ? await request.get(path) : await request.post(path, { data: {} });
      expect(response.status()).toBe(401);
      expect((await response.json()).error.code).toBe("unauthorized");
    });
  }
});

for (const path of ["/sign-in", "/sign-up"]) {
  test(`${path} has labelled fields and no automatic accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("show password toggles the field type", async ({ page }) => {
  await page.goto("/sign-in");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await page.getByLabel("Show password").check();
  await expect(password).toHaveAttribute("type", "text");
});
