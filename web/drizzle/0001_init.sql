CREATE TYPE "public"."alert_channel" AS ENUM('telegram', 'sms');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."conversation_channel" AS ENUM('web', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('pending_payment', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."handled_by" AS ENUM('assistant', 'helper');--> statement-breakpoint
CREATE TYPE "public"."help_channel" AS ENUM('web', 'telegram', 'phone', 'sms');--> statement-breakpoint
CREATE TYPE "public"."help_request_status" AS ENUM('waiting', 'assigned', 'in_progress', 'done', 'callback');--> statement-breakpoint
CREATE TYPE "public"."help_request_trigger" AS ENUM('learner', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."help_request_type" AS ENUM('payment', 'general', 'technical', 'telegram', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_type" AS ENUM('course', 'lesson', 'job', 'help_article', 'faq');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('learner', 'assistant', 'helper');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('mobile_money', 'bank_transfer', 'cash', 'card', 'scholarship', 'other');--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('learner', 'helper', 'admin', 'content_manager');--> statement-breakpoint
CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"channel" "alert_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"location" text,
	"job_type" "job_type",
	"channel" "alert_channel" DEFAULT 'telegram' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid,
	"channel" "conversation_channel" NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"handled_by" "handled_by" DEFAULT 'assistant' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"price_minor" integer DEFAULT 0 NOT NULL,
	"currency" char(3) NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "courses_price_not_negative" CHECK ("courses"."price_minor" >= 0),
	CONSTRAINT "courses_currency_upper" CHECK ("courses"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'pending_payment' NOT NULL,
	"progress" jsonb DEFAULT '{"completedLessonIds":[],"quizResults":{}}'::jsonb NOT NULL,
	"last_position" jsonb
);
--> statement-breakpoint
CREATE TABLE "help_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid,
	"type" "help_request_type" NOT NULL,
	"trigger" "help_request_trigger" NOT NULL,
	"reason" text NOT NULL,
	"summary" text,
	"status" "help_request_status" DEFAULT 'waiting' NOT NULL,
	"assigned_helper_id" uuid,
	"channel" "help_channel" NOT NULL,
	"page" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"employer" text NOT NULL,
	"location" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"requirements" text NOT NULL,
	"how_to_apply" text NOT NULL,
	"deadline" date,
	"accessibility_notes" text,
	"status" "job_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_type" "knowledge_source_type" NOT NULL,
	"source_id" uuid,
	"language" text DEFAULT 'en' NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768),
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "knowledge_chunks_version_positive" CHECK ("knowledge_chunks"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"audio_url" text,
	"transcript" text NOT NULL,
	"position" integer NOT NULL,
	"duration_seconds" integer,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "lessons_position_positive" CHECK ("lessons"."position" > 0),
	CONSTRAINT "lessons_audio_url_https" CHECK ("lessons"."audio_url" ~ '^https://')
);
--> statement-breakpoint
CREATE TABLE "link_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code_hash" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "link_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"handled_by" "handled_by" DEFAULT 'assistant' NOT NULL,
	CONSTRAINT "messages_flags_array" CHECK (jsonb_typeof("messages"."flags") = 'array')
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "modules_position_positive" CHECK ("modules"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"method" "payment_method" NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "payment_records_amount_positive" CHECK ("payment_records"."amount_minor" > 0),
	CONSTRAINT "payment_records_currency_upper" CHECK ("payment_records"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_records_confirmation_complete" CHECK (("payment_records"."confirmed_by" is null) = ("payment_records"."confirmed_at" is null))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"language" text DEFAULT 'en' NOT NULL,
	"role" "profile_role" DEFAULT 'learner' NOT NULL,
	"accessibility" jsonb DEFAULT '{"speechRate":1,"voice":"default","contrast":"standard","textSize":"default","interactionMode":"voice_and_text"}'::jsonb NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "profiles_email_lowercase" CHECK ("profiles"."email" = lower("profiles"."email")),
	CONSTRAINT "profiles_phone_e164" CHECK ("profiles"."phone" ~ '^\+[1-9][0-9]{6,14}$'),
	CONSTRAINT "profiles_name_not_blank" CHECK (length(trim("profiles"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"prompt" text NOT NULL,
	"choices" jsonb NOT NULL,
	"correct_choice" integer NOT NULL,
	"explanation" text NOT NULL,
	CONSTRAINT "quiz_questions_choices_array" CHECK (jsonb_typeof("quiz_questions"."choices") = 'array'),
	CONSTRAINT "quiz_questions_correct_choice_range" CHECK ("quiz_questions"."correct_choice" >= 0 and "quiz_questions"."correct_choice" < jsonb_array_length("quiz_questions"."choices"))
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"module_id" uuid NOT NULL,
	"lesson_id" uuid,
	"title" text NOT NULL,
	"pass_mark" integer DEFAULT 70 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "quizzes_pass_mark_range" CHECK ("quizzes"."pass_mark" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid NOT NULL,
	"telegram_id" bigint NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	CONSTRAINT "telegram_links_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "telegram_links_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "telegram_links_telegram_id_positive" CHECK ("telegram_links"."telegram_id" > 0)
);
--> statement-breakpoint
CREATE TABLE "unanswered_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"text" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"channel" "conversation_channel" NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_subscription_id_alert_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."alert_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_assigned_helper_id_profiles_id_fk" FOREIGN KEY ("assigned_helper_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_codes" ADD CONSTRAINT "link_codes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_confirmed_by_profiles_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_deliveries_subscription_job_key" ON "alert_deliveries" USING btree ("subscription_id","job_id");--> statement-breakpoint
CREATE INDEX "alert_deliveries_job_id_idx" ON "alert_deliveries" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "alert_deliveries_status_idx" ON "alert_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alert_subscriptions_profile_id_idx" ON "alert_subscriptions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "alert_subscriptions_active_idx" ON "alert_subscriptions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_profile_id_idx" ON "conversations" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "conversations_handled_by_idx" ON "conversations" USING btree ("handled_by");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_profile_course_key" ON "enrollments" USING btree ("profile_id","course_id");--> statement-breakpoint
CREATE INDEX "enrollments_course_id_idx" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "help_requests_profile_id_idx" ON "help_requests" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "help_requests_assigned_helper_id_idx" ON "help_requests" USING btree ("assigned_helper_id");--> statement-breakpoint
CREATE INDEX "help_requests_status_created_idx" ON "help_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "jobs_status_deadline_idx" ON "jobs" USING btree ("status","deadline");--> statement-breakpoint
CREATE INDEX "jobs_job_type_idx" ON "jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunks_source_idx" ON "knowledge_chunks" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_status_language_idx" ON "knowledge_chunks" USING btree ("status","language");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_module_position_key" ON "lessons" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "lessons_status_idx" ON "lessons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "link_codes_profile_id_idx" ON "link_codes" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "link_codes_expires_at_idx" ON "link_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_course_position_key" ON "modules" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "modules_status_idx" ON "modules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_records_enrollment_id_idx" ON "payment_records" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "payment_records_confirmed_by_idx" ON "payment_records" USING btree ("confirmed_by");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_questions_quiz_position_key" ON "quiz_questions" USING btree ("quiz_id","position");--> statement-breakpoint
CREATE INDEX "quizzes_module_id_idx" ON "quizzes" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "quizzes_lesson_id_idx" ON "quizzes" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "quizzes_status_idx" ON "quizzes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unanswered_questions_resolved_created_idx" ON "unanswered_questions" USING btree ("resolved","created_at");