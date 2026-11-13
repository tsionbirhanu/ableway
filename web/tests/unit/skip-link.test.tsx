import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SkipLink } from "@/components/skip-link";

describe("SkipLink", () => {
  it("links to the target with a default label", () => {
    const html = renderToStaticMarkup(<SkipLink targetId="main" />);
    expect(html).toContain('href="#main"');
    expect(html).toContain("Skip to main content");
  });

  it("accepts a custom label", () => {
    const html = renderToStaticMarkup(<SkipLink targetId="lesson" label="Skip to lesson" />);
    expect(html).toContain('href="#lesson"');
    expect(html).toContain("Skip to lesson");
  });
});
