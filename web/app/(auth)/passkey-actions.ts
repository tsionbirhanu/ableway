"use server";

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/auth/accounts";
import { signIn } from "@/lib/auth/auth";
import { ConflictError, RateLimitError } from "@/lib/auth/errors";
import {
  relyingPartyFromAppUrl,
  startPasskeyRegistration,
  startPasskeySignIn,
} from "@/lib/auth/passkeys";
import { clientIp } from "@/lib/auth/request-ip";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { firstErrors } from "./form-state";

/**
 * Public server actions for signing up and signing in.
 * Anyone can call them, so every input is validated with Zod and every
 * step is rate limited. Messages are short and plain, because the
 * assistant reads them aloud.
 */

export type Failure = {
  ok: false;
  code: "invalid" | "email_taken" | "rate_limited" | "failed";
  message: string;
  fieldErrors?: Record<string, string>;
};

const messages = {
  rateLimited: new RateLimitError(60).message,
  emailTaken: "This email already has an account. Please sign in instead.",
  passkeyFailed: "We could not check your passkey. Please try again.",
  passwordFailed: "The email or password is not right. Please try again.",
};

async function context() {
  return {
    ip: clientIp(await headers()),
    rp: relyingPartyFromAppUrl(getEnv().APP_URL),
  };
}

function toFailure(error: unknown): Failure {
  if (error instanceof ZodError) {
    return {
      ok: false,
      code: "invalid",
      message: "Some details need fixing.",
      fieldErrors: firstErrors(error),
    };
  }
  if (error instanceof RateLimitError) {
    return { ok: false, code: "rate_limited", message: messages.rateLimited };
  }
  if (error instanceof ConflictError) {
    return { ok: false, code: "email_taken", message: messages.emailTaken };
  }
  throw error;
}

/** Map an Auth.js sign-in failure to a plain message. */
function signInFailure(error: unknown, fallback: string): Failure {
  if (error instanceof CredentialsSignin) {
    if (error.code === "rate_limited") {
      return { ok: false, code: "rate_limited", message: messages.rateLimited };
    }
    if (error.code === "email_taken") {
      return { ok: false, code: "email_taken", message: messages.emailTaken };
    }
  }
  if (error instanceof AuthError) return { ok: false, code: "failed", message: fallback };
  throw error;
}

// ---------- Create an account with a passkey ----------

export async function startPasskeyRegistrationAction(
  details: unknown,
): Promise<
  { ok: true; challengeId: string; options: PublicKeyCredentialCreationOptionsJSON } | Failure
> {
  try {
    const result = await startPasskeyRegistration(getDb(), details, await context());
    return { ok: true, ...result };
  } catch (error) {
    return toFailure(error);
  }
}

export async function finishPasskeyRegistrationAction(
  challengeId: string,
  response: unknown,
): Promise<{ ok: true } | Failure> {
  try {
    await signIn("passkey", {
      mode: "register",
      challengeId: String(challengeId),
      response: JSON.stringify(response ?? null),
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    return signInFailure(error, messages.passkeyFailed);
  }
}

// ---------- Sign in with a passkey ----------

export async function startPasskeySignInAction(): Promise<
  { ok: true; challengeId: string; options: PublicKeyCredentialRequestOptionsJSON } | Failure
> {
  try {
    const result = await startPasskeySignIn(getDb(), await context());
    return { ok: true, ...result };
  } catch (error) {
    return toFailure(error);
  }
}

export async function finishPasskeySignInAction(
  challengeId: string,
  response: unknown,
): Promise<{ ok: true } | Failure> {
  try {
    await signIn("passkey", {
      mode: "authenticate",
      challengeId: String(challengeId),
      response: JSON.stringify(response ?? null),
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    return signInFailure(error, messages.passkeyFailed);
  }
}

// ---------- Sign in with email and password (fallback) ----------

export async function signInWithPasswordAction(
  email: unknown,
  password: unknown,
): Promise<{ ok: true } | Failure> {
  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) return toFailure(parsed.error);
  try {
    await signIn("password", { ...parsed.data, redirect: false });
    return { ok: true };
  } catch (error) {
    return signInFailure(error, messages.passwordFailed);
  }
}
