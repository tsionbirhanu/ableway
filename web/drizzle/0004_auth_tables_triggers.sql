-- updated_at triggers for the auth tables (function from 0002).
CREATE TRIGGER password_credentials_set_updated_at BEFORE UPDATE ON "password_credentials" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER rate_limits_set_updated_at BEFORE UPDATE ON "rate_limits" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
