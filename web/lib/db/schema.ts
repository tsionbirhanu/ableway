import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./columns";
import {
  defaultAccessibilitySettings,
  emptyProgress,
  type AccessibilitySettings,
  type AuditMetadata,
  type EnrollmentProgress,
  type LastPosition,
  type MessageFlag,
  type PendingProfile,
  type QuizChoices,
} from "./json-types";

/** Must match the Gemini embedding output size we request. */
export const EMBEDDING_DIMENSIONS = 768;

// =====================================================================
// Enums
// =====================================================================

export const profileRole = pgEnum("profile_role", [
  "learner",
  "helper",
  "admin",
  "content_manager",
]);
export const contentStatus = pgEnum("content_status", ["draft", "published"]);
export const enrollmentStatus = pgEnum("enrollment_status", [
  "pending_payment",
  "active",
  "completed",
]);
/**
 * How the learner paid. We record the method only. Card numbers, PINs and
 * mobile-money passwords must never be stored anywhere.
 */
export const paymentMethod = pgEnum("payment_method", [
  "mobile_money",
  "bank_transfer",
  "cash",
  "card",
  "scholarship",
  "other",
]);
export const helpRequestType = pgEnum("help_request_type", [
  "payment",
  "general",
  "technical",
  "telegram",
  "urgent",
]);
export const helpRequestTrigger = pgEnum("help_request_trigger", ["learner", "assistant"]);
export const helpRequestStatus = pgEnum("help_request_status", [
  "waiting",
  "assigned",
  "in_progress",
  "done",
  "callback",
]);
export const helpChannel = pgEnum("help_channel", ["web", "telegram", "phone", "sms"]);
export const conversationChannel = pgEnum("conversation_channel", ["web", "telegram"]);
export const messageRole = pgEnum("message_role", ["learner", "assistant", "helper"]);
export const handledBy = pgEnum("handled_by", ["assistant", "helper"]);
export const jobStatus = pgEnum("job_status", ["draft", "published", "closed"]);
export const jobType = pgEnum("job_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "volunteer",
]);
export const alertChannel = pgEnum("alert_channel", ["telegram", "sms"]);
export const deliveryStatus = pgEnum("delivery_status", ["pending", "sent", "failed", "skipped"]);
export const knowledgeSourceType = pgEnum("knowledge_source_type", [
  "course",
  "lesson",
  "job",
  "help_article",
  "faq",
]);

// =====================================================================
// People
// =====================================================================

export const profiles = pgTable(
  "profiles",
  {
    ...baseColumns,
    name: text("name").notNull(),
    /**
     * Optional: many learners sign in with a phone number only.
     * Stored lower-case (enforced by a check constraint).
     */
    email: text("email").unique(),
    /** E.164 format, for example +251911234567. */
    phone: text("phone"),
    /** BCP 47 language tag, for example "en" or "am". */
    language: text("language").notNull().default("en"),
    role: profileRole("role").notNull().default("learner"),
    accessibility: jsonb("accessibility")
      .$type<AccessibilitySettings>()
      .notNull()
      .default(defaultAccessibilitySettings),
  },
  (t) => [
    index("profiles_role_idx").on(t.role),
    uniqueIndex("profiles_phone_key").on(t.phone),
    check("profiles_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("profiles_phone_e164", sql`${t.phone} ~ '^\\+[1-9][0-9]{6,14}$'`),
    check("profiles_name_not_blank", sql`length(trim(${t.name})) > 0`),
  ],
);

/**
 * Password hashes live in their own table, so no query on profiles can
 * ever return one by accident. One row per profile.
 */
export const passwordCredentials = pgTable("password_credentials", {
  ...baseColumns,
  profileId: uuid("profile_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  /** Self-describing scrypt hash: scrypt$N$r$p$salt$hash (base64url). */
  passwordHash: text("password_hash").notNull(),
});

/**
 * Passkeys (WebAuthn). We store only the public key: the private key never
 * leaves the learner's device. One profile can have several passkeys.
 */
export const passkeyCredentials = pgTable(
  "passkey_credentials",
  {
    ...baseColumns,
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Credential id from the authenticator, base64url. */
    credentialId: text("credential_id").notNull().unique(),
    /** COSE public key, base64url. */
    publicKey: text("public_key").notNull(),
    /** Signature counter, used to spot cloned authenticators. */
    counter: bigint("counter", { mode: "number" }).notNull().default(0),
    transports: text("transports").array().notNull().default(sql`'{}'::text[]`),
    /** "singleDevice" or "multiDevice" (synced, e.g. Google Password Manager, iCloud Keychain). */
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull().default(false),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    index("passkey_credentials_profile_id_idx").on(t.profileId),
    check("passkey_credentials_counter_not_negative", sql`${t.counter} >= 0`),
  ],
);

export const webauthnPurpose = pgEnum("webauthn_purpose", ["registration", "authentication"]);

/**
 * One-time WebAuthn challenges. Each is used once and expires after a few
 * minutes. For a new account, `pendingProfile` holds the details the learner
 * confirmed, until the passkey is created; it is cleared when used.
 */
export const webauthnChallenges = pgTable(
  "webauthn_challenges",
  {
    ...baseColumns,
    challenge: text("challenge").notNull().unique(),
    purpose: webauthnPurpose("purpose").notNull(),
    pendingProfile: jsonb("pending_profile").$type<PendingProfile>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("webauthn_challenges_expires_at_idx").on(t.expiresAt)],
);

/**
 * Fixed-window counters for rate limiting (sign-in, sign-up, help requests).
 * Keys hold a hash of the email, never the email itself.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    ...baseColumns,
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("rate_limits_key_window_key").on(t.key, t.windowStart),
    index("rate_limits_window_start_idx").on(t.windowStart),
  ],
);

// =====================================================================
// Courses and content
// =====================================================================

export const courses = pgTable(
  "courses",
  {
    ...baseColumns,
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    language: text("language").notNull().default("en"),
    status: contentStatus("status").notNull().default("draft"),
    /** Price in the currency's smallest unit (cents, santim...). 0 means free. */
    priceMinor: integer("price_minor").notNull().default(0),
    /** ISO 4217 code, for example "ETB" or "USD". */
    currency: char("currency", { length: 3 }).notNull(),
  },
  (t) => [
    index("courses_status_idx").on(t.status),
    check("courses_price_not_negative", sql`${t.priceMinor} >= 0`),
    check("courses_currency_upper", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const modules = pgTable(
  "modules",
  {
    ...baseColumns,
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Order within the course, starting at 1. */
    position: integer("position").notNull(),
    status: contentStatus("status").notNull().default("draft"),
  },
  (t) => [
    uniqueIndex("modules_course_position_key").on(t.courseId, t.position),
    index("modules_status_idx").on(t.status),
    check("modules_position_positive", sql`${t.position} > 0`),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    ...baseColumns,
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    audioUrl: text("audio_url"),
    /** Full text of the lesson. Required: every lesson must work without audio. */
    transcript: text("transcript").notNull(),
    /** Order within the module, starting at 1. */
    position: integer("position").notNull(),
    durationSeconds: integer("duration_seconds"),
    status: contentStatus("status").notNull().default("draft"),
  },
  (t) => [
    uniqueIndex("lessons_module_position_key").on(t.moduleId, t.position),
    index("lessons_status_idx").on(t.status),
    check("lessons_position_positive", sql`${t.position} > 0`),
    check("lessons_audio_url_https", sql`${t.audioUrl} ~ '^https://'`),
  ],
);

export const quizzes = pgTable(
  "quizzes",
  {
    ...baseColumns,
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    /** Set when the quiz checks one lesson. Null for an end-of-module quiz. */
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Percentage needed to pass. */
    passMark: integer("pass_mark").notNull().default(70),
    status: contentStatus("status").notNull().default("draft"),
  },
  (t) => [
    index("quizzes_module_id_idx").on(t.moduleId),
    index("quizzes_lesson_id_idx").on(t.lessonId),
    index("quizzes_status_idx").on(t.status),
    check("quizzes_pass_mark_range", sql`${t.passMark} between 0 and 100`),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    ...baseColumns,
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    prompt: text("prompt").notNull(),
    choices: jsonb("choices").$type<QuizChoices>().notNull(),
    /** Zero-based index into choices. */
    correctChoice: integer("correct_choice").notNull(),
    /** Read to the learner after they answer. */
    explanation: text("explanation").notNull(),
  },
  (t) => [
    uniqueIndex("quiz_questions_quiz_position_key").on(t.quizId, t.position),
    check("quiz_questions_choices_array", sql`jsonb_typeof(${t.choices}) = 'array'`),
    check(
      "quiz_questions_correct_choice_range",
      sql`${t.correctChoice} >= 0 and ${t.correctChoice} < jsonb_array_length(${t.choices})`,
    ),
  ],
);

// =====================================================================
// Enrollment and payment
// =====================================================================

export const enrollments = pgTable(
  "enrollments",
  {
    ...baseColumns,
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    status: enrollmentStatus("status").notNull().default("pending_payment"),
    progress: jsonb("progress").$type<EnrollmentProgress>().notNull().default(emptyProgress),
    lastPosition: jsonb("last_position").$type<LastPosition>(),
  },
  (t) => [
    uniqueIndex("enrollments_profile_course_key").on(t.profileId, t.courseId),
    index("enrollments_course_id_idx").on(t.courseId),
    index("enrollments_status_idx").on(t.status),
  ],
);

/**
 * A payment a human helper confirmed with the learner.
 * There is deliberately no free-text "reference" or "details" column:
 * it would invite someone to type card numbers or PINs into it.
 */
export const paymentRecords = pgTable(
  "payment_records",
  {
    ...baseColumns,
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    method: paymentMethod("method").notNull(),
    confirmedBy: uuid("confirmed_by").references(() => profiles.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    index("payment_records_enrollment_id_idx").on(t.enrollmentId),
    index("payment_records_confirmed_by_idx").on(t.confirmedBy),
    check("payment_records_amount_positive", sql`${t.amountMinor} > 0`),
    check("payment_records_currency_upper", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    // Confirmed means both who and when are set; unconfirmed means neither.
    check(
      "payment_records_confirmation_complete",
      sql`(${t.confirmedBy} is null) = (${t.confirmedAt} is null)`,
    ),
  ],
);

// =====================================================================
// Human help
// =====================================================================

export const helpRequests = pgTable(
  "help_requests",
  {
    ...baseColumns,
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    type: helpRequestType("type").notNull(),
    trigger: helpRequestTrigger("trigger").notNull(),
    /** Short reason, in the learner's words or the assistant's. */
    reason: text("reason").notNull(),
    /** Assistant summary of the conversation so far, for the helper. */
    summary: text("summary"),
    status: helpRequestStatus("status").notNull().default("waiting"),
    assignedHelperId: uuid("assigned_helper_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    channel: helpChannel("channel").notNull(),
    /** Web page the learner was on, if any. */
    page: text("page"),
  },
  (t) => [
    index("help_requests_profile_id_idx").on(t.profileId),
    index("help_requests_assigned_helper_id_idx").on(t.assignedHelperId),
    index("help_requests_status_created_idx").on(t.status, t.createdAt),
  ],
);

// =====================================================================
// Conversations
// =====================================================================

export const conversations = pgTable(
  "conversations",
  {
    ...baseColumns,
    /** Null for a Telegram user who has not linked an account yet. */
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    channel: conversationChannel("channel").notNull(),
    language: text("language").notNull().default("en"),
    /** Who is answering right now. Switches to helper on handover. */
    handledBy: handledBy("handled_by").notNull().default("assistant"),
  },
  (t) => [
    index("conversations_profile_id_idx").on(t.profileId),
    index("conversations_handled_by_idx").on(t.handledBy),
  ],
);

export const messages = pgTable(
  "messages",
  {
    ...baseColumns,
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    /** Stored after sensitive data is redacted. */
    content: text("content").notNull(),
    flags: jsonb("flags").$type<MessageFlag[]>().notNull().default([]),
    handledBy: handledBy("handled_by").notNull().default("assistant"),
  },
  (t) => [
    index("messages_conversation_created_idx").on(t.conversationId, t.createdAt),
    check("messages_flags_array", sql`jsonb_typeof(${t.flags}) = 'array'`),
  ],
);

// =====================================================================
// Telegram
// =====================================================================

export const telegramLinks = pgTable(
  "telegram_links",
  {
    ...baseColumns,
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Telegram user ids fit in 52 bits, so a JS number is safe. */
    telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
    language: text("language").notNull().default("en"),
    /** When the learner agreed to receive messages from the bot. */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  },
  (t) => [check("telegram_links_telegram_id_positive", sql`${t.telegramId} > 0`)],
);

/** One-time codes to link a Telegram account. Only the hash is stored. */
export const linkCodes = pgTable(
  "link_codes",
  {
    ...baseColumns,
    codeHash: text("code_hash").notNull().unique(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    index("link_codes_profile_id_idx").on(t.profileId),
    index("link_codes_expires_at_idx").on(t.expiresAt),
  ],
);

// =====================================================================
// Jobs and alerts
// =====================================================================

export const jobs = pgTable(
  "jobs",
  {
    ...baseColumns,
    title: text("title").notNull(),
    employer: text("employer").notNull(),
    location: text("location").notNull(),
    jobType: jobType("job_type").notNull(),
    description: text("description").notNull().default(""),
    requirements: text("requirements").notNull(),
    howToApply: text("how_to_apply").notNull(),
    deadline: date("deadline", { mode: "string" }),
    /** What the employer offers, for example screen reader support. */
    accessibilityNotes: text("accessibility_notes"),
    status: jobStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    suspicious: boolean("suspicious").notNull().default(false),
    reviewReason: text("review_reason"),
  },
  (t) => [
    index("jobs_status_deadline_idx").on(t.status, t.deadline),
    index("jobs_job_type_idx").on(t.jobType),
  ],
);

export const alertSubscriptions = pgTable(
  "alert_subscriptions",
  {
    ...baseColumns,
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    location: text("location"),
    jobType: jobType("job_type"),
    channel: alertChannel("channel").notNull().default("telegram"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("alert_subscriptions_profile_id_idx").on(t.profileId),
    index("alert_subscriptions_active_idx").on(t.active),
  ],
);

export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    ...baseColumns,
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => alertSubscriptions.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    channel: alertChannel("channel").notNull(),
    status: deliveryStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    // Never alert the same learner about the same job twice.
    uniqueIndex("alert_deliveries_subscription_job_key").on(t.subscriptionId, t.jobId),
    index("alert_deliveries_job_id_idx").on(t.jobId),
    index("alert_deliveries_status_idx").on(t.status),
  ],
);

export const alertCronState = pgTable("alert_cron_state", {
  ...baseColumns,
  key: text("key").notNull().unique(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull(),
});

// =====================================================================
// Knowledge base (retrieval)
// =====================================================================

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    ...baseColumns,
    sourceType: knowledgeSourceType("source_type").notNull(),
    /** Id of the course, lesson or job. Null for help articles and FAQs. */
    sourceId: uuid("source_id"),
    language: text("language").notNull().default("en"),
    title: text("title").notNull(),
    text: text("text").notNull(),
    /** Null until the chunk is embedded. */
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    version: integer("version").notNull().default(1),
    status: contentStatus("status").notNull().default("draft"),
  },
  (t) => [
    index("knowledge_chunks_embedding_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("knowledge_chunks_source_idx").on(t.sourceType, t.sourceId),
    index("knowledge_chunks_status_language_idx").on(t.status, t.language),
    check("knowledge_chunks_version_positive", sql`${t.version} > 0`),
  ],
);

/** Questions the assistant could not answer, for content managers to review. */
export const unansweredQuestions = pgTable(
  "unanswered_questions",
  {
    ...baseColumns,
    text: text("text").notNull(),
    language: text("language").notNull().default("en"),
    channel: conversationChannel("channel").notNull(),
    resolved: boolean("resolved").notNull().default(false),
  },
  (t) => [index("unanswered_questions_resolved_created_idx").on(t.resolved, t.createdAt)],
);

// =====================================================================
// Audit
// =====================================================================

export const auditLog = pgTable(
  "audit_log",
  {
    ...baseColumns,
    /** Null when the system acted (cron jobs, the assistant). */
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    /** Dotted verb, for example "payment.confirmed". */
    action: text("action").notNull(),
    /** "table:id", for example "enrollments:5f0c...". */
    target: text("target").notNull(),
    metadata: jsonb("metadata").$type<AuditMetadata>().notNull().default({}),
  },
  (t) => [
    index("audit_log_actor_id_idx").on(t.actorId),
    index("audit_log_action_idx").on(t.action),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);

/** Every table, in dependency order. Used by tests and the updated_at trigger check. */
export const allTables = {
  profiles,
  passwordCredentials,
  passkeyCredentials,
  webauthnChallenges,
  rateLimits,
  courses,
  modules,
  lessons,
  quizzes,
  quizQuestions,
  enrollments,
  paymentRecords,
  helpRequests,
  conversations,
  messages,
  telegramLinks,
  linkCodes,
  jobs,
  alertSubscriptions,
  alertDeliveries,
  alertCronState,
  knowledgeChunks,
  unansweredQuestions,
  auditLog,
};
