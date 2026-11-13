CREATE TYPE "public"."webauthn_purpose" AS ENUM('registration', 'authentication');--> statement-breakpoint
CREATE TABLE "passkey_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text[] DEFAULT '{}'::text[] NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "passkey_credentials_credential_id_unique" UNIQUE("credential_id"),
	CONSTRAINT "passkey_credentials_counter_not_negative" CHECK ("passkey_credentials"."counter" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"challenge" text NOT NULL,
	"purpose" "webauthn_purpose" NOT NULL,
	"pending_profile" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "webauthn_challenges_challenge_unique" UNIQUE("challenge")
);
--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_credentials_profile_id_idx" ON "passkey_credentials" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "webauthn_challenges_expires_at_idx" ON "webauthn_challenges" USING btree ("expires_at");