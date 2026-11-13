import { describe, expect, it } from "vitest";
import {
  accessibilitySettingsSchema,
  auditMetadataSchema,
  defaultAccessibilitySettings,
  emptyProgress,
  enrollmentProgressSchema,
  lastPositionSchema,
  messageFlagsSchema,
  quizChoicesSchema,
} from "@/lib/db/json-types";

const lessonId = "4f1c2b5e-8a3d-4c7e-9b1a-2d3e4f5a6b7c";

describe("accessibilitySettingsSchema", () => {
  it("accepts the defaults", () => {
    expect(accessibilitySettingsSchema.parse(defaultAccessibilitySettings)).toEqual(
      defaultAccessibilitySettings,
    );
  });

  it.each([
    ["speech too slow", { speechRate: 0.1 }],
    ["speech too fast", { speechRate: 5 }],
    ["unknown contrast", { contrast: "neon" }],
    ["unknown text size", { textSize: "huge" }],
    ["unknown mode", { interactionMode: "telepathy" }],
    ["empty voice", { voice: "  " }],
    ["extra keys", { script: "alert(1)" }],
  ])("rejects %s", (_label, change) => {
    expect(
      accessibilitySettingsSchema.safeParse({ ...defaultAccessibilitySettings, ...change }).success,
    ).toBe(false);
  });
});

describe("enrollmentProgressSchema", () => {
  it("accepts empty progress", () => {
    expect(enrollmentProgressSchema.safeParse(emptyProgress).success).toBe(true);
  });

  it("accepts quiz results keyed by quiz id", () => {
    const result = enrollmentProgressSchema.safeParse({
      completedLessonIds: [lessonId],
      quizResults: { [lessonId]: { bestScore: 80, passed: true, attempts: 2 } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores above 100 and non-uuid ids", () => {
    expect(
      enrollmentProgressSchema.safeParse({
        completedLessonIds: ["lesson-1"],
        quizResults: {},
      }).success,
    ).toBe(false);
    expect(
      enrollmentProgressSchema.safeParse({
        completedLessonIds: [],
        quizResults: { [lessonId]: { bestScore: 101, passed: true, attempts: 1 } },
      }).success,
    ).toBe(false);
  });
});

describe("lastPositionSchema", () => {
  it("accepts a lesson and offset", () => {
    expect(lastPositionSchema.safeParse({ lessonId, audioSeconds: 12.5 }).success).toBe(true);
  });

  it("rejects negative offsets", () => {
    expect(lastPositionSchema.safeParse({ lessonId, audioSeconds: -1 }).success).toBe(false);
  });
});

describe("quizChoicesSchema", () => {
  it("needs 2 to 6 non-empty choices", () => {
    expect(quizChoicesSchema.safeParse(["Yes", "No"]).success).toBe(true);
    expect(quizChoicesSchema.safeParse(["Only one"]).success).toBe(false);
    expect(quizChoicesSchema.safeParse(["a", "b", "c", "d", "e", "f", "g"]).success).toBe(false);
    expect(quizChoicesSchema.safeParse(["a", ""]).success).toBe(false);
  });
});

describe("messageFlagsSchema", () => {
  it("accepts known flags only", () => {
    expect(messageFlagsSchema.safeParse(["sensitive_data_redacted"]).success).toBe(true);
    expect(messageFlagsSchema.safeParse(["made_up_flag"]).success).toBe(false);
  });
});

describe("auditMetadataSchema", () => {
  it("accepts flat values and short arrays", () => {
    expect(
      auditMetadataSchema.safeParse({ method: "cash", amount: 100, ok: true, ids: ["a"] }).success,
    ).toBe(true);
  });

  it("rejects nested objects", () => {
    expect(auditMetadataSchema.safeParse({ nested: { deep: 1 } }).success).toBe(false);
  });
});
