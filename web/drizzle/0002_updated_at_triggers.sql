-- Keep updated_at correct for every update, including raw SQL and admin tools.
-- Drizzle also sets it via $onUpdate; this trigger is the safety net.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON "profiles" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON "courses" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER modules_set_updated_at BEFORE UPDATE ON "modules" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON "lessons" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER quizzes_set_updated_at BEFORE UPDATE ON "quizzes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER quiz_questions_set_updated_at BEFORE UPDATE ON "quiz_questions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER enrollments_set_updated_at BEFORE UPDATE ON "enrollments" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER payment_records_set_updated_at BEFORE UPDATE ON "payment_records" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER help_requests_set_updated_at BEFORE UPDATE ON "help_requests" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON "conversations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER messages_set_updated_at BEFORE UPDATE ON "messages" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER telegram_links_set_updated_at BEFORE UPDATE ON "telegram_links" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER link_codes_set_updated_at BEFORE UPDATE ON "link_codes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER alert_subscriptions_set_updated_at BEFORE UPDATE ON "alert_subscriptions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER alert_deliveries_set_updated_at BEFORE UPDATE ON "alert_deliveries" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER knowledge_chunks_set_updated_at BEFORE UPDATE ON "knowledge_chunks" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER unanswered_questions_set_updated_at BEFORE UPDATE ON "unanswered_questions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER audit_log_set_updated_at BEFORE UPDATE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
