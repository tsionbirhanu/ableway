ALTER TABLE jobs ADD COLUMN published_at timestamptz;--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN suspicious boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN review_reason text;--> statement-breakpoint
ALTER TABLE alert_deliveries ADD COLUMN attempts integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE TABLE alert_cron_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  key text NOT NULL UNIQUE,
  last_run_at timestamptz NOT NULL
);--> statement-breakpoint
CREATE TRIGGER alert_cron_state_set_updated_at BEFORE UPDATE ON alert_cron_state FOR EACH ROW EXECUTE FUNCTION set_updated_at();
