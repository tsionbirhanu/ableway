import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormField } from "@/components/form-field";

describe("FormField", () => {
  it("labels the input", () => {
    const html = renderToStaticMarkup(<FormField id="email" name="email" label="Email address" />);
    expect(html).toContain('<label for="email">Email address</label>');
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("aria-describedby");
  });

  it("links the hint and error with aria-describedby, error first", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="password"
        name="password"
        label="Password"
        hint="At least 8"
        error="Too short"
      />,
    );
    expect(html).toContain('aria-describedby="password-error password-hint"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="password-error"');
    expect(html).toContain('id="password-hint"');
  });
});
