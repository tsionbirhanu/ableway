import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { splitIntoChunks } from "@/lib/knowledge/chunker";
import { FakeEmbedder } from "@/lib/knowledge/embedder";
import {
  ingest,
  ingestCourse,
  ingestLesson,
  ingestJob,
  ingestStaticSources,
} from "@/lib/knowledge/ingest";
import { retrieve } from "@/lib/knowledge/retrieve";
import { createTestDb, type TestDb } from "../db/test-db";

let t: TestDb;
const fakeEmbedder = new FakeEmbedder();

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

describe("lib/knowledge", () => {
  describe("Chunker (splitIntoChunks)", () => {
    it("keeps short texts as a single chunk", () => {
      const shortText =
        "Ableway is an accessible platform for blind learners. It supports screen readers and audio.";
      const chunks = splitIntoChunks(shortText);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(shortText);
    });

    it("splits long texts into chunks of ~300-500 words with small overlap", () => {
      // Create a 900-word text
      const words = Array.from({ length: 900 }, (_, i) => `word${i}`);
      const longText = words.join(" ");

      const chunks = splitIntoChunks(longText, {
        targetWords: 350,
        maxWords: 500,
        overlapWords: 50,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      for (const chunk of chunks) {
        const count = chunk.split(/\s+/).length;
        expect(count).toBeGreaterThanOrEqual(100);
        expect(count).toBeLessThanOrEqual(500);
      }

      // Check overlap between chunk 0 and chunk 1
      const words0 = chunks[0].split(/\s+/);
      const words1 = chunks[1].split(/\s+/);
      const overlapWord = words0[words0.length - 1];
      expect(words1).toContain(overlapWord);
    });
  });

  describe("FakeEmbedder", () => {
    it("returns 768-dimensional normalized vectors", async () => {
      const vec = await fakeEmbedder.embed("How do I enroll in Data Analytics?");
      expect(vec).toHaveLength(768);

      const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it("produces high cosine similarity for related texts and low for off-topic", async () => {
      const vec1 = await fakeEmbedder.embed("Telebirr payment process and human helper");
      const vec2 = await fakeEmbedder.embed("How do I pay with Telebirr?");
      const vecOffTopic = await fakeEmbedder.embed(
        "Astronomical telescope galaxy redshift observation",
      );

      // Cosine similarity for unit vectors is dot product
      const dotRelated = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
      const dotOffTopic = vec1.reduce((sum, val, i) => sum + val * vecOffTopic[i], 0);

      expect(dotRelated).toBeGreaterThan(0.4);
      expect(dotOffTopic).toBeLessThan(0.2);
    });
  });

  describe("Ingest & Retrieve (The Core Requirement)", () => {
    beforeAll(async () => {
      // Ingest standard static knowledge sources with fake embedder
      await ingestStaticSources({ db: t.db, embedder: fakeEmbedder });
    });

    it("returns the exact right chunk for a question from the test set", async () => {
      // Question 1: Payment & human help
      const paymentResults = await retrieve(
        "How do I pay with Telebirr and get help from staff?",
        "en",
        3,
        {
          db: t.db,
          embedder: fakeEmbedder,
          minSimilarity: 0.25,
        },
      );

      expect(paymentResults.length).toBeGreaterThan(0);
      expect(paymentResults[0].title).toContain("Payment");
      expect(paymentResults[0].text).toContain("Telebirr");
      expect(paymentResults[0].similarity).toBeGreaterThanOrEqual(0.25);
      expect(paymentResults[0].status).toBe("published");
    });

    it("returns the Telegram guide when asking about Telegram linking", async () => {
      const telegramResults = await retrieve(
        "How to link Telegram to receive audio lessons?",
        "en",
        3,
        {
          db: t.db,
          embedder: fakeEmbedder,
          minSimilarity: 0.25,
        },
      );

      expect(telegramResults.length).toBeGreaterThan(0);
      expect(telegramResults[0].title).toContain("Telegram");
      expect(telegramResults[0].text).toContain("@ableway_bot");
    });

    it("returns the course catalog when asking about course prices and durations", async () => {
      const courseResults = await retrieve(
        "What courses are available and how much do they cost?",
        "en",
        3,
        {
          db: t.db,
          embedder: fakeEmbedder,
          minSimilarity: 0.15,
        },
      );

      expect(courseResults.length).toBeGreaterThan(0);
      expect(courseResults[0].title).toContain("Course");
      expect(courseResults[0].text).toContain("Data Analytics");
    });

    it("returns NOTHING (empty list) for off-topic questions below minimum similarity", async () => {
      const offTopicQuestions = [
        "What is the airspeed velocity of an unladen swallow?",
        "Quantum electrodynamics and Feynman diagram vertices",
        "How do penguins build nests in Antarctica during winter?",
      ];

      for (const question of offTopicQuestions) {
        const results = await retrieve(question, "en", 5, {
          db: t.db,
          embedder: fakeEmbedder,
          minSimilarity: 0.2,
        });

        // The assistant can say it is not sure!
        expect(results).toEqual([]);
      }
    });

    it("records unanswered question when recordIfUnanswered is set", async () => {
      const question = "What is the secret recipe for medieval Byzantine bread?";
      const results = await retrieve(question, "en", 5, {
        db: t.db,
        embedder: fakeEmbedder,
        minSimilarity: 0.2,
        recordIfUnanswered: true,
        channel: "web",
      });

      expect(results).toEqual([]);

      const unanswered = await t.db
        .select()
        .from(schema.unansweredQuestions)
        .where(eq(schema.unansweredQuestions.text, question));

      expect(unanswered).toHaveLength(1);
      expect(unanswered[0].resolved).toBe(false);
      expect(unanswered[0].channel).toBe("web");
    });

    it("filters out draft/unpublished chunks from search results", async () => {
      // Ingest a draft chunk
      await ingest(
        {
          sourceType: "help_article",
          title: "Internal Unreleased Secret Feature",
          text: "Secret experimental blockchain integration for rewards.",
          language: "en",
          status: "draft",
        },
        { db: t.db, embedder: fakeEmbedder },
      );

      // Search for the draft content
      const results = await retrieve("Secret experimental blockchain integration", "en", 5, {
        db: t.db,
        embedder: fakeEmbedder,
        minSimilarity: 0.05,
      });

      // Must not return the draft chunk
      const draftResult = results.find((r) => r.title === "Internal Unreleased Secret Feature");
      expect(draftResult).toBeUndefined();
    });

    it("filters correctly by language (Amharic vs English)", async () => {
      const amharicResults = await retrieve("ክፍያ በቴሌብር እንዴት መክፈል እችላለሁ?", "am-ET", 3, {
        db: t.db,
        embedder: fakeEmbedder,
        minSimilarity: 0.05,
      });

      expect(amharicResults.length).toBeGreaterThan(0);
      expect(amharicResults[0].language).toBe("am-ET");
      expect(amharicResults[0].text).toContain("ቴሌብር");
    });
  });

  describe("Entities Ingestion & Versioning", () => {
    it("ingests and versions course descriptions and prices", async () => {
      // Insert a test course into the DB
      const [course] = await t.db
        .insert(schema.courses)
        .values({
          slug: "test-ai-course",
          title: "Accessible Artificial Intelligence",
          description:
            "Learn modern AI tools with your screen reader. Master prompting, transcription, and workflows.",
          priceMinor: 50000,
          currency: "ETB",
          language: "en",
          status: "published",
        })
        .returning();

      expect(course).toBeDefined();

      // Ingest course
      const chunks = await ingestCourse(course.id, { db: t.db, embedder: fakeEmbedder });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].sourceId).toBe(course.id);
      expect(chunks[0].sourceType).toBe("course");
      expect(chunks[0].version).toBe(1);
      expect(chunks[0].text).toContain("Accessible Artificial Intelligence");
      expect(chunks[0].text).toContain("500 ETB");

      // Re-ingest (e.g. course updated) -> version bumps to 2
      const updatedChunks = await ingestCourse(course.id, { db: t.db, embedder: fakeEmbedder });
      expect(updatedChunks.length).toBeGreaterThan(0);
      expect(updatedChunks[0].version).toBe(2);

      // Search returns the course
      const searchRes = await retrieve(
        "Accessible Artificial Intelligence prompting screen reader",
        "en",
        1,
        {
          db: t.db,
          embedder: fakeEmbedder,
          minSimilarity: 0.25,
        },
      );
      expect(searchRes.length).toBeGreaterThan(0);
      expect(searchRes[0].title).toBe("Accessible Artificial Intelligence");
    });

    it("ingests lesson transcripts", async () => {
      // Create a course and lesson
      const [c] = await t.db
        .insert(schema.courses)
        .values({
          slug: "keyboard-course",
          title: "Keyboard Shortcuts 101",
          description: "Learn navigation hotkeys.",
          currency: "USD",
          status: "published",
        })
        .returning();

      const [m] = await t.db
        .insert(schema.modules)
        .values({
          courseId: c.id,
          title: "Hotkeys Module",
          description: "Description",
          position: 1,
          status: "published",
        })
        .returning();

      const [l] = await t.db
        .insert(schema.lessons)
        .values({
          moduleId: m.id,
          title: "Mastering Tab and Shift Tab",
          transcript:
            "In this lesson you learn to move focus forward with Tab, and backward with Shift Tab. Practice navigating links.",
          durationSeconds: 180,
          position: 1,
          status: "published",
        })
        .returning();

      const lessonChunks = await ingestLesson(l.id, { db: t.db, embedder: fakeEmbedder });
      expect(lessonChunks.length).toBe(1);
      expect(lessonChunks[0].sourceType).toBe("lesson");
      expect(lessonChunks[0].title).toBe("Mastering Tab and Shift Tab");
      expect(lessonChunks[0].text).toContain("Shift Tab");
    });

    it("ingests job posts", async () => {
      const [job] = await t.db
        .insert(schema.jobs)
        .values({
          title: "Accessibility QA Analyst",
          employer: "AbleTech Global",
          location: "Remote",
          jobType: "full_time",
          description: "Audit web applications using NVDA and keyboard.",
          requirements: "Experience with screen readers and WCAG standards.",
          howToApply: "Email jobs@abletech.example.org",
          accessibilityNotes: "100% remote. Screen reader software provided.",
          status: "published",
        })
        .returning();

      const jobChunks = await ingestJob(job.id, { db: t.db, embedder: fakeEmbedder });
      expect(jobChunks.length).toBe(1);
      expect(jobChunks[0].sourceType).toBe("job");
      expect(jobChunks[0].title).toContain("Accessibility QA Analyst");
      expect(jobChunks[0].text).toContain("NVDA");
    });
  });
});
