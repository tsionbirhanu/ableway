-- updated_at triggers for the passkey tables (function from 0002).
CREATE TRIGGER passkey_credentials_set_updated_at BEFORE UPDATE ON "passkey_credentials" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER webauthn_challenges_set_updated_at BEFORE UPDATE ON "webauthn_challenges" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
