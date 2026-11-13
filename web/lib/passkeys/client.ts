import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishPasskeyRegistrationAction,
  finishPasskeySignInAction,
  startPasskeyRegistrationAction,
  startPasskeySignInAction,
} from "@/app/(auth)/passkey-actions";
import type { PendingProfileInput } from "@/lib/db/json-types";

/**
 * Browser side of passkeys, for any page (register, login, sign-in).
 * Every result has a short message the assistant can read aloud.
 */

export type PasskeyResult =
  | { ok: true }
  | {
      ok: false;
      /** unsupported: this device or browser cannot make passkeys. cancelled: the learner stopped or it timed out. */
      reason: "unsupported" | "cancelled" | "invalid" | "email_taken" | "rate_limited" | "failed";
      message: string;
      fieldErrors?: Record<string, string>;
    };

export const passkeyMessages = {
  unsupported:
    "This device cannot make a passkey. You can use a password instead, or ask a helper.",
  cancelled: "The passkey was not created. You can try again when you are ready.",
  signInCancelled: "Sign in was stopped. You can try again when you are ready.",
  noPasskey: "We could not find a passkey for Ableway on this device.",
  failed: "Something went wrong. Please try again, or ask a helper.",
};

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

/**
 * A server error or lost connection must never leave the learner in silence:
 * always return a message the page can read aloud.
 */
async function withFailureMessage(run: () => Promise<PasskeyResult>): Promise<PasskeyResult> {
  try {
    return await run();
  } catch (error) {
    console.error("Passkey step failed", error);
    return { ok: false, reason: "failed", message: passkeyMessages.failed };
  }
}

/** The learner stopped the device prompt, it timed out, or the device refused. */
function isCancelled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "NotAllowedError" ||
      error.name === "AbortError" ||
      ("code" in error && error.code === "ERROR_CEREMONY_ABORTED"))
  );
}

/**
 * Create a learner account with a passkey, using details the learner has
 * already confirmed. On success the learner is signed in.
 */
export async function createAccountWithPasskey(
  details: PendingProfileInput,
): Promise<PasskeyResult> {
  return withFailureMessage(() => createAccount(details));
}

async function createAccount(details: PendingProfileInput): Promise<PasskeyResult> {
  if (!passkeysSupported()) {
    return { ok: false, reason: "unsupported", message: passkeyMessages.unsupported };
  }

  const started = await startPasskeyRegistrationAction(details);
  if (!started.ok)
    return {
      ok: false,
      reason: started.code,
      message: started.message,
      fieldErrors: started.fieldErrors,
    };

  let response;
  try {
    response = await startRegistration({ optionsJSON: started.options });
  } catch (error) {
    if (isCancelled(error))
      return { ok: false, reason: "cancelled", message: passkeyMessages.cancelled };
    return { ok: false, reason: "failed", message: passkeyMessages.failed };
  }

  const finished = await finishPasskeyRegistrationAction(started.challengeId, response);
  if (!finished.ok) return { ok: false, reason: finished.code, message: finished.message };
  return { ok: true };
}

/** Sign in with a passkey already on this device. No email needed. */
export async function signInWithPasskey(): Promise<PasskeyResult> {
  return withFailureMessage(signIn);
}

async function signIn(): Promise<PasskeyResult> {
  if (!passkeysSupported()) {
    return { ok: false, reason: "unsupported", message: passkeyMessages.unsupported };
  }

  const started = await startPasskeySignInAction();
  if (!started.ok) return { ok: false, reason: started.code, message: started.message };

  let response;
  try {
    response = await startAuthentication({ optionsJSON: started.options });
  } catch (error) {
    if (isCancelled(error)) {
      return { ok: false, reason: "cancelled", message: passkeyMessages.signInCancelled };
    }
    return { ok: false, reason: "failed", message: passkeyMessages.failed };
  }

  const finished = await finishPasskeySignInAction(started.challengeId, response);
  if (!finished.ok) {
    // A failed check usually means this passkey is not registered with us.
    const message = finished.code === "failed" ? passkeyMessages.noPasskey : finished.message;
    return { ok: false, reason: finished.code, message };
  }
  return { ok: true };
}

const PREFILL_KEY = "ableway_signup_prefill";

/**
 * Keep name and email for the password sign-up page, so a learner whose
 * device cannot make a passkey does not have to say them again.
 * sessionStorage only: cleared when the tab closes. Never stores passwords.
 */
export function saveSignUpPrefill(details: { name?: string; email?: string }): void {
  try {
    sessionStorage.setItem(
      PREFILL_KEY,
      JSON.stringify({ name: details.name, email: details.email }),
    );
  } catch {
    // Storage blocked: the learner fills the form again.
  }
}

export function takeSignUpPrefill(): { name?: string; email?: string } {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    sessionStorage.removeItem(PREFILL_KEY);
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (typeof value !== "object" || value === null) return {};
    const { name, email } = value as Record<string, unknown>;
    return {
      name: typeof name === "string" ? name.slice(0, 100) : undefined,
      email: typeof email === "string" ? email.slice(0, 254) : undefined,
    };
  } catch {
    return {};
  }
}
