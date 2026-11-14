CREATE TYPE "public"."consent_purpose" AS ENUM('privacy_policy', 'voice_retention', 'telegram_messages', 'job_alerts');--> statement-breakpoint
CREATE TYPE "public"."consent_source" AS ENUM('web', 'telegram', 'helper');--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" text NOT NULL,
	"source" "consent_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid NOT NULL,
	"audio" "bytea" NOT NULL,
	"content_type" text DEFAULT 'audio/wav' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_records" DROP CONSTRAINT "payment_records_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_records" ALTER COLUMN "enrollment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_profile_purpose_idx" ON "consent_records" USING btree ("profile_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "voice_recordings_profile_id_idx" ON "voice_recordings" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "voice_recordings_expires_at_idx" ON "voice_recordings" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TRIGGER "consent_records_set_updated_at" BEFORE UPDATE ON "consent_records" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "voice_recordings_set_updated_at" BEFORE UPDATE ON "voice_recordings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- The audit log is append-only. The only change allowed is the database
-- itself clearing actor_id when that person's account is deleted.
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_log is append-only';
  END IF;
  IF NEW.action IS DISTINCT FROM OLD.action
     OR NEW.target IS DISTINCT FROM OLD.target
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (NEW.actor_id IS DISTINCT FROM OLD.actor_id AND NEW.actor_id IS NOT NULL) THEN
    RAISE EXCEPTION 'audit_log is append-only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
