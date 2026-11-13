import * as s from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { Actor } from "@/lib/auth/roles";

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error("fixture insert returned no row");
  return row;
}

/**
 * Two learners (A and B) who each own an enrollment, a conversation with
 * messages, and a help request. Plus two helpers, an admin and a content manager.
 * Helper 1 is assigned to learner A's help request.
 */
export async function createAuthFixtures(db: Db) {
  const person = (name: string, email: string, role: Actor["role"], phone: string) =>
    one(
      db
        .insert(s.profiles)
        .values({ name, email, role, phone })
        .returning({ id: s.profiles.id, role: s.profiles.role }),
    );

  const learnerA = await person("Learner A", "a@example.org", "learner", "+15555550201");
  const learnerB = await person("Learner B", "b@example.org", "learner", "+15555550202");
  const helper = await person("Helper One", "h1@example.org", "helper", "+15555550211");
  const otherHelper = await person("Helper Two", "h2@example.org", "helper", "+15555550212");
  const admin = await person("Admin", "admin@example.org", "admin", "+15555550221");
  const contentManager = await person(
    "Content",
    "cm@example.org",
    "content_manager",
    "+15555550231",
  );

  const course = await one(
    db
      .insert(s.courses)
      .values({
        slug: "fixture-course",
        title: "Fixture Course",
        description: "D",
        currency: "USD",
        priceMinor: 1000,
        status: "published",
      })
      .returning({ id: s.courses.id }),
  );
  const course2 = await one(
    db
      .insert(s.courses)
      .values({
        slug: "fixture-course-2",
        title: "Second",
        description: "D",
        currency: "USD",
        priceMinor: 500,
      })
      .returning({ id: s.courses.id }),
  );

  const enrollment = (profileId: string, courseId: string) =>
    one(
      db
        .insert(s.enrollments)
        .values({ profileId, courseId, status: "pending_payment" })
        .returning({ id: s.enrollments.id }),
    );

  const enrollmentA = await enrollment(learnerA.id, course.id);
  const enrollmentB = await enrollment(learnerB.id, course.id);
  /** A helper enrolled as a learner too: they must not confirm their own payment. */
  const helperEnrollment = await enrollment(helper.id, course2.id);

  const conversation = async (profileId: string, text: string) => {
    const c = await one(
      db
        .insert(s.conversations)
        .values({ profileId, channel: "web" })
        .returning({ id: s.conversations.id }),
    );
    await db.insert(s.messages).values([
      { conversationId: c.id, role: "learner", content: text },
      { conversationId: c.id, role: "assistant", content: "Reply" },
    ]);
    return c;
  };
  const conversationA = await conversation(learnerA.id, "A's private message");
  const conversationB = await conversation(learnerB.id, "B's private message");

  const helpRequest = (profileId: string, assignedHelperId: string | null, summary: string) =>
    one(
      db
        .insert(s.helpRequests)
        .values({
          profileId,
          type: "payment",
          trigger: "assistant",
          reason: "Needs help paying",
          summary,
          channel: "phone",
          status: assignedHelperId ? "assigned" : "waiting",
          assignedHelperId,
        })
        .returning({ id: s.helpRequests.id }),
    );
  const helpRequestA = await helpRequest(learnerA.id, helper.id, "Summary for A");
  const helpRequestB = await helpRequest(learnerB.id, null, "Summary for B");

  return {
    learnerA,
    learnerB,
    helper,
    otherHelper,
    admin,
    contentManager,
    course,
    enrollmentA,
    enrollmentB,
    helperEnrollment,
    conversationA,
    conversationB,
    helpRequestA,
    helpRequestB,
  };
}

export type AuthFixtures = Awaited<ReturnType<typeof createAuthFixtures>>;
