import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next already registers the jsx-a11y plugin.
    // We add its full strict rule set on top of Next's small default set.
    files: ["**/*.{js,jsx,mjs,ts,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Scrollable regions, chat logs and tab panels must be focusable so
      // keyboard users can scroll them (axe: scrollable-region-focusable;
      // WAI-ARIA tabs pattern).
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "region", "log"], allowExpressionValues: true },
      ],
      // Card-style radio and checkbox labels nest their text a few levels deep.
      "jsx-a11y/label-has-associated-control": ["error", { depth: 5 }],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Client code must never read server env directly.
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/lib/env", message: "lib/env is server-only. Pass values as props." }],
        },
      ],
    },
  },
  {
    // Server code logs only through lib/log.ts, which removes personal data.
    files: ["lib/**/*.{ts,tsx}", "app/api/**/*.ts", "instrumentation.ts"],
    ignores: ["lib/log.ts"],
    rules: {
      "no-console": "error",
    },
  },
  {
    // Browser-only modules may report to the learner's own console.
    files: ["lib/a11y/**", "lib/passkeys/client.ts", "lib/speech/client/**", "lib/audio/**"],
    rules: { "no-console": "off" },
  },
  // Must be last: turns off rules that clash with Prettier.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    // Static Savanna pages and vendor scripts (Bootstrap, Popper).
    "public/**",
  ]),
]);

export default eslintConfig;
