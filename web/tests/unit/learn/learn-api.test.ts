import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";
import { askAssistant } from "@/lib/assistant";
import { FakeEmbedder } from "@/lib/knowledge/embedder";
import {
  assertLessonPublishChecklist,
  validateLessonPublishChecklist,
} from "@/lib/learn/checklist";

const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const learnCourseRoute = await import("@/app/api/learn/[courseId]/route");
const progressRoute = await import("@/app/api/learn/progress/route");
const quizSubmitRoute = await import("@/app/api/learn/quiz/[id]/submit/route");
const summaryRoute = await import("@/app/api/learn/summary/route");
const adminLessonsRoute = await import("@/app/api/admin/content/lessons/route");
const adminLessonDetailRoute = await import("@/app/api/admin/content/lessons/[id]/route");
const adminQuizzesRoute = await import("@/app/api/admin/content/quizzes/route");

describe("Learning System End-to-End: Access Control, Grading, Resume, Checklist, and Assistant", () => {
  let t: TestDb;
  const fakeEmbedder = new FakeEmbedder();

  let learnerId: string;
  let otherLearnerId: string;
  let contentManagerId: string;

  let courseId: string;
  let moduleId: string;
  let lesson1Id: string;
  let lesson2Id: string;
  let quizId: string;
  let questionId: string;

  beforeAll(async () => {
    t = await createTestDb();
    state.db = t.db;

    // Create Profiles
    const [learner] = await t.db
      .insert(schema.profiles)
      .values({
        name: "Test Learner",
        role: "learner",
        primaryLanguage: "en",
      })
      .returning();
    learnerId = learner.id;

    const [otherLearner] = await t.db
      .insert(schema.profiles)
      .values({
        name: "Other Learner",
        role: "learner",
        primaryLanguage: "en",
      })
      .returning();
    otherLearnerId = otherLearner.id;

    const [contentMgr] = await t.db
      .insert(schema.profiles)
      .values({
        name: "Content Manager",
        role: "content_manager",
        primaryLanguage: "en",
      })
      .returning();
    contentManagerId = contentMgr.id;

    // Create Course
    const [course] = await t.db
      .insert(schema.courses)
      .values({
        slug: "accessible-computing-101",
        title: "Accessible Computing 101",
        description: "Comprehensive guide to accessible keyboard navigation and screen readers.",
        priceMinor: 50000,
        currency: "ETB",
        language: "en",
        status: "published",
      })
      .returning();
    courseId = course.id;

    // Create Module
    const [mod] = await t.db
      .insert(schema.modules)
      .values({
        courseId: course.id,
        title: "Module 1: Screen Reader Architecture",
        description: "Foundational keyboard and landmark concepts.",
        position: 1,
        status: "published",
      })
      .returning();
    moduleId = mod.id;

    // Create Lessons
    const [les1] = await t.db
      .insert(schema.lessons)
      .values({
        moduleId: mod.id,
        title: "Lesson 1: Modifier Keys",
        transcript: "In screen reader keyboard navigation, NVDA and JAWS use the Insert or CapsLock key as the primary modifier. Headings are jumped with the H key.",
        audioUrl: "https://storage.example.com/audio/les-1.mp3",
        durationSeconds: 300,
        position: 1,
        status: "published",
      })
      .returning();
    lesson1Id = les1.id;

    const [les2] = await t.db
      .insert(schema.lessons)
      .values({
        moduleId: mod.id,
        title: "Lesson 2: ARIA Landmarks",
        transcript: "ARIA landmarks such as main, nav, and banner allow learners to jump between distinct document regions using the D shortcut.",
        audioUrl: "https://storage.example.com/audio/les-2.mp3",
        durationSeconds: 420,
        position: 2,
        status: "published",
      })
      .returning();
    lesson2Id = les2.id;

    // Create Quiz
    const [quiz] = await t.db
      .insert(schema.quizzes)
      .values({
        moduleId: mod.id,
        title: "Module 1 Assessment",
        passMark: 70,
        status: "published",
      })
      .returning();
    quizId = quiz.id;

    // Create Quiz Question with correctChoice and explanation
    const [q1] = await t.db
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz.id,
        position: 1,
        prompt: "Which key is pressed in NVDA to jump between headings on a webpage?",
        choices: ["Tab key", "H key", "Shift + Down Arrow", "Enter key"],
        correctChoice: 1, // 'H key'
        explanation: "Pressing 'H' navigates sequentially through headings on the page.",
      })
      .returning();
    questionId = q1.id;
  }, 60000);

  afterAll(async () => {
    await t?.client.close();
  });

  const signIn = (userId: string | null) => {
    state.userId = userId;
  };

  // =========================================================================
  // 1. Publish Checklist Tests
  // =========================================================================
  describe("Publish Checklist Enforcement", () => {
    it("validates checklist and rejects publication without transcript", () => {
      const result = validateLessonPublishChecklist({
        title: "No Transcript Lesson",
        transcript: "",
        audioUrl: "https://example.com/audio.mp3",
        status: "published",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("transcript"))).toBe(true);

      expect(() =>
        assertLessonPublishChecklist({
          title: "No Transcript Lesson",
          transcript: "   ",
          audioUrl: "https://example.com/audio.mp3",
          status: "published",
        })
      ).toThrowError(/transcript/i);
    });

    it("rejects publication without audio or text explanation", () => {
      const result = validateLessonPublishChecklist({
        title: "No Audio or Text",
        transcript: "",
        audioUrl: null,
        status: "published",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects publication if images lack descriptions", () => {
      const result = validateLessonPublishChecklist({
        title: "Image Without Alt",
        transcript: "Here is a complete transcript.",
        audioUrl: "https://example.com/audio.mp3",
        status: "published",
        imageDescriptions: {
          "diagram1.png": "   ", // missing description
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("diagram1.png"))).toBe(true);

      expect(() =>
        assertLessonPublishChecklist({
          title: "Image Without Alt",
          transcript: "Here is a complete transcript.",
          audioUrl: "https://example.com/audio.mp3",
          status: "published",
          imageDescriptions: {
            "diagram1.png": "",
          },
        })
      ).toThrowError(/diagram1.png/i);
    });

    it("permits publication when transcript, audio/text, and image descriptions are present", () => {
      const result = validateLessonPublishChecklist({
        title: "Fully Accessible Lesson",
        transcript: "Full audio transcript of the lesson.",
        audioUrl: "https://example.com/audio.mp3",
        status: "published",
        imageDescriptions: {
          "keyboard.png": "Diagram showing the CapsLock modifier key.",
        },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      expect(() =>
        assertLessonPublishChecklist({
          title: "Fully Accessible Lesson",
          transcript: "Full audio transcript of the lesson.",
          audioUrl: "https://example.com/audio.mp3",
          status: "published",
          imageDescriptions: {
            "keyboard.png": "Diagram showing the CapsLock modifier key.",
          },
        })
      ).not.toThrow();
    });

    it("enforces checklist via Content Manager API", async () => {
      signIn(contentManagerId);

      // Attempt creating a published lesson without transcript -> must fail 400
      const failRes = await adminLessonsRoute.POST(
        new Request("http://localhost/api/admin/content/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            title: "Draft to Published Missing Transcript",
            position: 99,
            status: "published",
            transcript: "",
          }),
        })
      );
      expect(failRes.status).toBe(400);

      // Draft lesson is allowed without transcript
      const draftRes = await adminLessonsRoute.POST(
        new Request("http://localhost/api/admin/content/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            title: "Valid Draft Lesson",
            position: 3,
            status: "draft",
          }),
        })
      );
      expect(draftRes.status).toBe(201);
      const { lesson: draftLesson } = await draftRes.json();

      // Attempting to publish the draft via PATCH without transcript -> must fail 400
      const publishFailRes = await adminLessonDetailRoute.PATCH(
        new Request(`http://localhost/api/admin/content/lessons/${draftLesson.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "published",
          }),
        }),
        { params: Promise.resolve({ id: draftLesson.id }) }
      );
      expect(publishFailRes.status).toBe(400);
    });
  });

  // =========================================================================
  // 2. Access Control Tests
  // =========================================================================
  describe("Access Control (Active enrollment required)", () => {
    it("refuses access with 403 when learner is not enrolled in the course", async () => {
      signIn(otherLearnerId);

      const res = await learnCourseRoute.GET(
        new Request(`http://localhost/api/learn/${courseId}`),
        { params: Promise.resolve({ courseId }) }
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.message).toMatch(/active enrollment/i);
    });

    it("refuses access with 403 when enrollment is pending_payment", async () => {
      // Create pending_payment enrollment
      await t.db.insert(schema.enrollments).values({
        profileId: learnerId,
        courseId,
        status: "pending_payment",
      });

      signIn(learnerId);

      const res = await learnCourseRoute.GET(
        new Request(`http://localhost/api/learn/${courseId}`),
        { params: Promise.resolve({ courseId }) }
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.message).toMatch(/active enrollment/i);
    });

    it("grants access with 200 when enrollment is active", async () => {
      // Activate enrollment
      await t.db
        .update(schema.enrollments)
        .set({ status: "active" })
        .where(eq(schema.enrollments.profileId, learnerId));

      signIn(learnerId);

      const res = await learnCourseRoute.GET(
        new Request(`http://localhost/api/learn/${courseId}`),
        { params: Promise.resolve({ courseId }) }
      );
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.course.id).toBe(courseId);
      expect(data.modules).toHaveLength(1);
      expect(data.modules[0].lessons.length).toBeGreaterThanOrEqual(2);
      expect(data.modules[0].quizzes).toHaveLength(1);
    });

    it("strictly omits correct answers and explanations before quiz submission", async () => {
      signIn(learnerId);

      const res = await learnCourseRoute.GET(
        new Request(`http://localhost/api/learn/${courseId}`),
        { params: Promise.resolve({ courseId }) }
      );
      const data = await res.json();
      const firstQuiz = data.modules[0].quizzes[0];
      const firstQ = firstQuiz.questions[0];

      expect(firstQ.prompt).toBe("Which key is pressed in NVDA to jump between headings on a webpage?");
      expect(firstQ.choices).toHaveLength(4);

      // Verify that correctChoice and explanation are NEVER sent to the client
      expect((firstQ as any).correctChoice).toBeUndefined();
      expect((firstQ as any).explanation).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. Server-side Grading Tests
  // =========================================================================
  describe("Server-Side Quiz Grading", () => {
    it("refuses submission from unenrolled or inactive learner", async () => {
      signIn(otherLearnerId);

      const res = await quizSubmitRoute.POST(
        new Request(`http://localhost/api/learn/quiz/${quizId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: { [questionId]: 1 },
          }),
        }),
        { params: Promise.resolve({ id: quizId }) }
      );
      expect(res.status).toBe(403);
    });

    it("grades incorrect answer on server, returns 0%, and provides explanation", async () => {
      signIn(learnerId);

      const res = await quizSubmitRoute.POST(
        new Request(`http://localhost/api/learn/quiz/${quizId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: { [questionId]: 0 }, // wrong answer (Tab key)
          }),
        }),
        { params: Promise.resolve({ id: quizId }) }
      );

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.score).toBe(0);
      expect(data.passed).toBe(false);
      expect(data.correctCount).toBe(0);
      expect(data.feedback).toMatch(/scored 0%/i);
      expect(data.questions[0].isCorrect).toBe(false);
      expect(data.questions[0].correctChoice).toBe(1);
      expect(data.questions[0].explanation).toBe("Pressing 'H' navigates sequentially through headings on the page.");
    });

    it("grades correct answer on server, returns 100%, and updates progress in database", async () => {
      signIn(learnerId);

      const res = await quizSubmitRoute.POST(
        new Request(`http://localhost/api/learn/quiz/${quizId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: { [questionId]: 1 }, // correct answer (H key)
          }),
        }),
        { params: Promise.resolve({ id: quizId }) }
      );

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.score).toBe(100);
      expect(data.passed).toBe(true);
      expect(data.correctCount).toBe(1);
      expect(data.feedback).toMatch(/Congratulations! You passed with 100%/i);
      expect(data.questions[0].isCorrect).toBe(true);

      // Verify DB progress updated
      const [enrollment] = await t.db
        .select()
        .from(schema.enrollments)
        .where(eq(schema.enrollments.profileId, learnerId));

      expect(enrollment.progress?.quizResults?.[quizId]?.passed).toBe(true);
      expect(enrollment.progress?.quizResults?.[quizId]?.bestScore).toBe(100);
    });
  });

  // =========================================================================
  // 4. Progress and Resume Tests
  // =========================================================================
  describe("Progress Tracking and Resume", () => {
    it("POST /api/learn/progress saves audio position and completed lessons", async () => {
      signIn(learnerId);

      const saveRes = await progressRoute.POST(
        new Request("http://localhost/api/learn/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            completedLessonId: lesson1Id,
            lastPosition: {
              lessonId: lesson2Id,
              audioSeconds: 125,
            },
          }),
        })
      );

      expect(saveRes.status).toBe(200);
      const data = await saveRes.json();
      expect(data.ok).toBe(true);
      expect(data.progress.completedLessonIds).toContain(lesson1Id);
      expect(data.lastPosition.lessonId).toBe(lesson2Id);
      expect(data.lastPosition.audioSeconds).toBe(125);
    });

    it("GET /api/learn/progress returns where to resume", async () => {
      signIn(learnerId);

      const resumeRes = await progressRoute.GET(
        new Request(`http://localhost/api/learn/progress?courseId=${courseId}`)
      );
      expect(resumeRes.status).toBe(200);
      const data = await resumeRes.json();

      expect(data.resumeLessonId).toBe(lesson2Id);
      expect(data.resumeAudioSeconds).toBe(125);
      expect(data.nextLesson.id).toBe(lesson2Id);
      expect(data.completedCount).toBe(1);
      expect(data.isCompleted).toBe(false);
    });
  });

  // =========================================================================
  // 5. Plain-Language Summary Tests
  // =========================================================================
  describe("GET /api/learn/summary", () => {
    it("returns short listening-friendly progress summary", async () => {
      signIn(learnerId);

      const res = await summaryRoute.GET();
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.activeCourseCount).toBe(1);
      expect(data.summary).toMatch(/Accessible Computing 101/);
      expect(data.summary).toMatch(/completed/i);
    });
  });

  // =========================================================================
  // 6. Assistant Grounded with Lesson Transcript
  // =========================================================================
  describe("Assistant with Lesson Transcript Retrieval Context", () => {
    it("answers questions using the current lesson transcript", async () => {
      const result = await askAssistant({
        channel: "web",
        userId: learnerId,
        text: "What key is used as the primary modifier in NVDA?",
        language: "en",
        pageContext: {
          page: "/learn",
          lessonId: lesson1Id,
        },
        db: t.db,
        embedder: fakeEmbedder,
        apiKey: "mock",
      });

      expect(result.reply).toBeDefined();
      expect(result.reply.length).toBeGreaterThan(10);
      // The answer must mention the modifier key from lesson 1 transcript
      expect(
        result.reply.toLowerCase().includes("insert") ||
        result.reply.toLowerCase().includes("modifier") ||
        result.reply.toLowerCase().includes("lesson")
      ).toBe(true);
      // Sources must include the lesson chunk
      expect(result.sources.some((s) => s.sourceType === "lesson")).toBe(true);
    });
  });
});
