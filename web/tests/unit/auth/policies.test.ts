import { describe, expect, it } from "vitest";
import * as p from "@/lib/auth/policies";
import type { Actor } from "@/lib/auth/roles";

const learnerA: Actor = { id: "learner-a", role: "learner" };
const learnerB: Actor = { id: "learner-b", role: "learner" };
const helper: Actor = { id: "helper-1", role: "helper" };
const otherHelper: Actor = { id: "helper-2", role: "helper" };
const admin: Actor = { id: "admin-1", role: "admin" };
const contentManager: Actor = { id: "cm-1", role: "content_manager" };
const nobody = null;

const ownedByA = { profileId: learnerA.id };
const ownedByB = { profileId: learnerB.id };

describe("learners read only their own data", () => {
  it("enrollments", () => {
    expect(p.canViewEnrollment(learnerA, ownedByA)).toBe(true);
    expect(p.canViewEnrollment(learnerA, ownedByB)).toBe(false);
    expect(p.canUpdateEnrollmentProgress(learnerA, ownedByA)).toBe(true);
    expect(p.canUpdateEnrollmentProgress(learnerA, ownedByB)).toBe(false);
  });

  it("messages", () => {
    expect(p.canViewMessages(learnerA, ownedByA)).toBe(true);
    expect(p.canViewMessages(learnerA, ownedByB)).toBe(false);
    expect(p.canViewMessages(learnerA, { profileId: null })).toBe(false);
  });

  it("help requests", () => {
    const requestA = { profileId: learnerA.id, assignedHelperId: helper.id };
    const requestB = { profileId: learnerB.id, assignedHelperId: null };
    expect(p.canViewHelpRequest(learnerA, requestA)).toBe(true);
    expect(p.canViewHelpRequest(learnerA, requestB)).toBe(false);
    expect(p.canListHelpRequests(learnerA)).toBe(false);
    expect(p.canUpdateHelpRequest(learnerA)).toBe(false);
    expect(p.canViewHelpRequestContact(learnerA, requestA)).toBe(false);
  });

  it("profiles and payment records", () => {
    expect(p.canViewProfile(learnerA, learnerA.id)).toBe(true);
    expect(p.canViewProfile(learnerA, learnerB.id)).toBe(false);
    expect(p.canUpdateProfile(learnerA, learnerB.id)).toBe(false);
    expect(p.canViewPaymentRecords(learnerA, ownedByA)).toBe(true);
    expect(p.canViewPaymentRecords(learnerA, ownedByB)).toBe(false);
    expect(p.canEnroll(learnerA, learnerA.id)).toBe(true);
    expect(p.canEnroll(learnerA, learnerB.id)).toBe(false);
  });

  it("cannot confirm any payment, including their own", () => {
    expect(p.canConfirmPayment(learnerA, ownedByA)).toBe(false);
    expect(p.canConfirmPayment(learnerA, ownedByB)).toBe(false);
  });

  it("cannot manage content or see admin data", () => {
    expect(p.canManageCourse(learnerA)).toBe(false);
    expect(p.canManageJobs(learnerA)).toBe(false);
    expect(p.canManageKnowledge(learnerA)).toBe(false);
    expect(p.canViewUnansweredQuestions(learnerA)).toBe(false);
    expect(p.canViewAuditLog(learnerA)).toBe(false);
    expect(p.canChangeRole(learnerA, learnerB.id)).toBe(false);
  });
});

describe("helpers see help requests and summaries, not other personal data", () => {
  const assignedToHelper = { profileId: learnerA.id, assignedHelperId: helper.id };

  it("can list, view and update help requests", () => {
    expect(p.canListHelpRequests(helper)).toBe(true);
    expect(p.canViewHelpRequest(helper, assignedToHelper)).toBe(true);
    expect(p.canViewHelpRequest(helper, { profileId: learnerB.id, assignedHelperId: null })).toBe(
      true,
    );
    expect(p.canUpdateHelpRequest(helper)).toBe(true);
  });

  it("sees contact details only when assigned", () => {
    expect(p.canViewHelpRequestContact(helper, assignedToHelper)).toBe(true);
    expect(p.canViewHelpRequestContact(otherHelper, assignedToHelper)).toBe(false);
    expect(
      p.canViewHelpRequestContact(helper, { profileId: learnerB.id, assignedHelperId: null }),
    ).toBe(false);
  });

  it("cannot read enrollments, messages, profiles or payment records", () => {
    expect(p.canViewEnrollment(helper, ownedByA)).toBe(false);
    expect(p.canViewMessages(helper, ownedByA)).toBe(false);
    expect(p.canViewProfile(helper, learnerA.id)).toBe(false);
    expect(p.canViewPaymentRecords(helper, ownedByA)).toBe(false);
  });

  it("can confirm payments, but never for their own enrollment", () => {
    expect(p.canConfirmPayment(helper, ownedByA)).toBe(true);
    expect(p.canConfirmPayment(helper, { profileId: helper.id })).toBe(false);
  });

  it("cannot manage content", () => {
    expect(p.canManageCourse(helper)).toBe(false);
    expect(p.canViewAuditLog(helper)).toBe(false);
  });
});

describe("content managers", () => {
  it("manage courses, jobs and knowledge", () => {
    expect(p.canManageCourse(contentManager)).toBe(true);
    expect(p.canManageJobs(contentManager)).toBe(true);
    expect(p.canManageKnowledge(contentManager)).toBe(true);
    expect(p.canViewUnansweredQuestions(contentManager)).toBe(true);
  });

  it("do not see learners' data, help requests or payments", () => {
    expect(p.canViewEnrollment(contentManager, ownedByA)).toBe(false);
    expect(p.canViewMessages(contentManager, ownedByA)).toBe(false);
    expect(p.canListHelpRequests(contentManager)).toBe(false);
    expect(p.canConfirmPayment(contentManager, ownedByA)).toBe(false);
  });
});

describe("admins", () => {
  it("can do everything except confirm their own payment or change their own role", () => {
    expect(p.canViewEnrollment(admin, ownedByA)).toBe(true);
    expect(p.canViewMessages(admin, ownedByA)).toBe(true);
    expect(p.canConfirmPayment(admin, ownedByA)).toBe(true);
    expect(p.canConfirmPayment(admin, { profileId: admin.id })).toBe(false);
    expect(p.canViewAuditLog(admin)).toBe(true);
    expect(p.canChangeRole(admin, learnerA.id)).toBe(true);
    expect(p.canChangeRole(admin, admin.id)).toBe(false);
    expect(p.canEnroll(admin, learnerA.id)).toBe(true);
  });
});

describe("nobody signed in", () => {
  it("is denied everything except published courses and asking for help", () => {
    expect(p.canViewEnrollment(nobody, ownedByA)).toBe(false);
    expect(p.canViewMessages(nobody, { profileId: null })).toBe(false);
    expect(p.canViewHelpRequest(nobody, { profileId: null, assignedHelperId: null })).toBe(false);
    expect(p.canConfirmPayment(nobody, ownedByA)).toBe(false);
    expect(p.canManageCourse(nobody)).toBe(false);
    expect(p.canViewProfile(nobody, learnerA.id)).toBe(false);
    expect(p.canViewCourse(nobody, { status: "published" })).toBe(true);
    expect(p.canViewCourse(nobody, { status: "draft" })).toBe(false);
    expect(p.canCreateHelpRequest(nobody, null)).toBe(true);
    expect(p.canCreateHelpRequest(nobody, learnerA.id)).toBe(false);
  });
});

describe("help requests and draft courses", () => {
  it("signed-in people ask for help only for themselves", () => {
    expect(p.canCreateHelpRequest(learnerA, learnerA.id)).toBe(true);
    expect(p.canCreateHelpRequest(learnerA, learnerB.id)).toBe(false);
    expect(p.canCreateHelpRequest(admin, learnerB.id)).toBe(true);
  });

  it("only content managers and admins see draft courses", () => {
    expect(p.canViewCourse(learnerA, { status: "draft" })).toBe(false);
    expect(p.canViewCourse(helper, { status: "draft" })).toBe(false);
    expect(p.canViewCourse(contentManager, { status: "draft" })).toBe(true);
    expect(p.canViewCourse(admin, { status: "draft" })).toBe(true);
  });
});
