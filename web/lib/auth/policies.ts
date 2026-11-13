import type { Actor, Role } from "./roles";

/**
 * Authorization rules. One pure function per rule, no database access,
 * so every rule is easy to test. Route handlers and server actions load
 * the resource, then call the matching rule.
 *
 * Summary:
 * - Learners read and change only their own data.
 * - Helpers see help requests and the assistant's conversation summary.
 *   They do not see learners' messages, enrollments, or other personal data,
 *   except contact details on a help request assigned to them.
 * - Content managers manage courses, jobs and the knowledge base.
 * - Admins can do everything.
 *
 * `actor` is null when nobody is signed in.
 */

type MaybeActor = Actor | null;

const hasRole = (actor: MaybeActor, ...allowed: Role[]): actor is Actor =>
  actor !== null && allowed.includes(actor.role);

const isAdmin = (actor: MaybeActor): boolean => hasRole(actor, "admin");
const isSelf = (actor: MaybeActor, profileId: string | null): boolean =>
  actor !== null && profileId !== null && actor.id === profileId;

// ---------- Profiles ----------

export function canViewProfile(actor: MaybeActor, profileId: string): boolean {
  return isSelf(actor, profileId) || isAdmin(actor);
}

export function canUpdateProfile(actor: MaybeActor, profileId: string): boolean {
  return isSelf(actor, profileId) || isAdmin(actor);
}

/** Only admins change roles, and never their own (so the last admin cannot lock everyone out). */
export function canChangeRole(actor: MaybeActor, profileId: string): boolean {
  return isAdmin(actor) && !isSelf(actor, profileId);
}

// ---------- Courses and content ----------

export function canViewCourse(
  actor: MaybeActor,
  course: { status: "draft" | "published" },
): boolean {
  return course.status === "published" || canManageCourse(actor);
}

export function canManageCourse(actor: MaybeActor): boolean {
  return hasRole(actor, "content_manager", "admin");
}

export function canManageJobs(actor: MaybeActor): boolean {
  return hasRole(actor, "content_manager", "admin");
}

export function canManageKnowledge(actor: MaybeActor): boolean {
  return hasRole(actor, "content_manager", "admin");
}

export function canViewUnansweredQuestions(actor: MaybeActor): boolean {
  return hasRole(actor, "content_manager", "admin");
}

// ---------- Enrollments and payments ----------

type Owned = { profileId: string };

export function canViewEnrollment(actor: MaybeActor, enrollment: Owned): boolean {
  return isSelf(actor, enrollment.profileId) || isAdmin(actor);
}

export function canUpdateEnrollmentProgress(actor: MaybeActor, enrollment: Owned): boolean {
  return isSelf(actor, enrollment.profileId);
}

/** Learners enroll themselves. Admins can enroll anyone. */
export function canEnroll(actor: MaybeActor, profileId: string): boolean {
  return isSelf(actor, profileId) || isAdmin(actor);
}

/**
 * Helpers and admins confirm payments they completed with the learner.
 * Nobody confirms a payment for their own enrollment.
 */
export function canConfirmPayment(actor: MaybeActor, enrollment: Owned): boolean {
  return hasRole(actor, "helper", "admin") && !isSelf(actor, enrollment.profileId);
}

export function canViewPaymentRecords(actor: MaybeActor, enrollment: Owned): boolean {
  return isSelf(actor, enrollment.profileId) || isAdmin(actor);
}

// ---------- Conversations ----------

export function canViewMessages(
  actor: MaybeActor,
  conversation: { profileId: string | null },
): boolean {
  return isSelf(actor, conversation.profileId) || isAdmin(actor);
}

// ---------- Help requests ----------

type HelpRequestRef = { profileId: string | null; assignedHelperId: string | null };

/** Anyone can ask for help, even before signing in. Signed-in people ask only for themselves. */
export function canCreateHelpRequest(actor: MaybeActor, forProfileId: string | null): boolean {
  if (actor === null) return forProfileId === null;
  return forProfileId === actor.id || isAdmin(actor);
}

export function canListHelpRequests(actor: MaybeActor): boolean {
  return hasRole(actor, "helper", "admin");
}

/** Includes the assistant's conversation summary. */
export function canViewHelpRequest(actor: MaybeActor, request: HelpRequestRef): boolean {
  return isSelf(actor, request.profileId) || hasRole(actor, "helper", "admin");
}

export function canUpdateHelpRequest(actor: MaybeActor): boolean {
  return hasRole(actor, "helper", "admin");
}

/** Phone and email: only for the helper assigned to the request, and admins. */
export function canViewHelpRequestContact(actor: MaybeActor, request: HelpRequestRef): boolean {
  if (isAdmin(actor)) return true;
  return hasRole(actor, "helper") && request.assignedHelperId === actor.id;
}

// ---------- Admin ----------

export function canViewAuditLog(actor: MaybeActor): boolean {
  return isAdmin(actor);
}
