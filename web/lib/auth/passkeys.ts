import { randomBytes } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import { pendingProfileSchema } from "@/lib/db/json-types";
import { auditLog, passkeyCredentials, profiles, webauthnChallenges } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { ConflictError } from "./errors";
import { enforce, hashKeyPart, LIMITS } from "./rate-limit";
import type { Actor } from "./roles";

/**
 * Passkey sign-up and sign-in (WebAuthn), without passwords or codes.
 *
 * Each ceremony has two steps:
 *   1. start: we create a one-time challenge and send options to the browser.
 *   2. finish: the device signs the challenge; we verify it with the public key.
 *
 * Challenges are stored in the database, used once, and expire after 5 minutes.
 * The private key never leaves the learner's device; we never see biometrics.
 */

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Who we are, from APP_URL. The passkey only works on this exact site (phishing-proof). */
export type RelyingParty = { id: string; name: string; origin: string };

export function relyingPartyFromAppUrl(appUrl: string, name = "Ableway"): RelyingParty {
  const url = new URL(appUrl);
  return { id: url.hostname, name, origin: url.origin };
}

type Options = { ip: string; rp: RelyingParty; now?: Date };

/** Browser responses are untrusted: check their shape before verifying. */
const credentialResponseSchema = z.looseObject({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal("public-key"),
  response: z.looseObject({ clientDataJSON: z.string().min(1).max(10_000) }),
});

export const finishInputSchema = z.object({
  challengeId: z.uuid(),
  response: credentialResponseSchema,
});

const ipKey = (prefix: string, ip: string) => `${prefix}:ip:${hashKeyPart(ip)}`;

/** Use a challenge once. Returns null if it is unknown, expired, used, or for another purpose. */
async function consumeChallenge(
  db: Db,
  challengeId: string,
  purpose: "registration" | "authentication",
  now: Date,
) {
  const [row] = await db
    .update(webauthnChallenges)
    .set({ usedAt: now, pendingProfile: null })
    .where(
      and(
        eq(webauthnChallenges.id, challengeId),
        eq(webauthnChallenges.purpose, purpose),
        isNull(webauthnChallenges.usedAt),
        gt(webauthnChallenges.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Registration (new learner account)
// ---------------------------------------------------------------------------

/**
 * Step 1 of creating an account with a passkey. The learner has already
 * confirmed their details. Fails early if the email already has an account.
 */
export async function startPasskeyRegistration(
  db: Db,
  input: unknown,
  { ip, rp, now = new Date() }: Options,
): Promise<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }> {
  const details = pendingProfileSchema.parse(input);

  await enforce(
    db,
    [
      { key: ipKey("passkey-start", ip), limit: LIMITS.passkeyStartPerIp },
      { key: `signup:email:${hashKeyPart(details.email)}`, limit: LIMITS.signUpPerEmail },
    ],
    now,
  );

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, details.email));
  if (existing) {
    throw new ConflictError("This email already has an account. Please sign in instead.");
  }

  const options = await generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    userName: details.email,
    userDisplayName: details.name,
    // A random handle, not the email or profile id, so the device learns nothing personal.
    userID: new Uint8Array(randomBytes(32)),
    attestationType: "none",
    authenticatorSelection: {
      // Discoverable: the learner can sign in later without typing their email.
      residentKey: "required",
      // Fingerprint, face, or device PIN is required.
      userVerification: "required",
    },
    timeout: CHALLENGE_TTL_MS,
  });

  const [row] = await db
    .insert(webauthnChallenges)
    .values({
      challenge: options.challenge,
      purpose: "registration",
      pendingProfile: details,
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    })
    .returning({ id: webauthnChallenges.id });
  if (!row) throw new Error("Could not store the passkey challenge");

  return { challengeId: row.id, options };
}

/**
 * Step 2: verify the new passkey, then create the learner and store the
 * public key, in one transaction. Returns null if verification fails.
 */
export async function finishPasskeyRegistration(
  db: Db,
  input: unknown,
  { ip, rp, now = new Date() }: Options,
): Promise<Actor | null> {
  const parsed = finishInputSchema.safeParse(input);
  if (!parsed.success) return null;

  await enforce(db, [{ key: ipKey("passkey-finish", ip), limit: LIMITS.passkeyFinishPerIp }], now);

  // Read the pending details before consuming (consuming clears them).
  const [pending] = await db
    .select({ pendingProfile: webauthnChallenges.pendingProfile })
    .from(webauthnChallenges)
    .where(eq(webauthnChallenges.id, parsed.data.challengeId));
  const challenge = await consumeChallenge(db, parsed.data.challengeId, "registration", now);
  const details = pendingProfileSchema.safeParse(pending?.pendingProfile);
  if (!challenge || !details.success) return null;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: parsed.data.response as unknown as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
    });
  } catch {
    return null;
  }
  if (!verification.verified) return null;

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const profile = details.data;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(profiles)
      .values({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        language: profile.language,
        role: "learner",
      })
      .onConflictDoNothing({ target: profiles.email })
      .returning({ id: profiles.id, role: profiles.role });
    if (!created) {
      throw new ConflictError("This email already has an account. Please sign in instead.");
    }

    await tx.insert(passkeyCredentials).values({
      profileId: created.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      lastUsedAt: now,
    });
    await tx.insert(auditLog).values({
      actorId: created.id,
      action: "account.created",
      target: `profiles:${created.id}`,
      metadata: { method: "passkey" },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Authentication (sign in)
// ---------------------------------------------------------------------------

/**
 * Step 1 of signing in. No email needed: the device offers the learner's
 * passkeys for this site (discoverable credentials).
 */
export async function startPasskeySignIn(
  db: Db,
  { ip, rp, now = new Date() }: Options,
): Promise<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }> {
  await enforce(db, [{ key: ipKey("passkey-start", ip), limit: LIMITS.passkeyStartPerIp }], now);

  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    userVerification: "required",
    timeout: CHALLENGE_TTL_MS,
  });

  const [row] = await db
    .insert(webauthnChallenges)
    .values({
      challenge: options.challenge,
      purpose: "authentication",
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    })
    .returning({ id: webauthnChallenges.id });
  if (!row) throw new Error("Could not store the passkey challenge");

  return { challengeId: row.id, options };
}

/** Step 2: verify the signature with the stored public key. Returns null on any failure. */
export async function finishPasskeySignIn(
  db: Db,
  input: unknown,
  { ip, rp, now = new Date() }: Options,
): Promise<Actor | null> {
  const parsed = finishInputSchema.safeParse(input);
  if (!parsed.success) return null;

  await enforce(db, [{ key: ipKey("passkey-finish", ip), limit: LIMITS.passkeyFinishPerIp }], now);

  const challenge = await consumeChallenge(db, parsed.data.challengeId, "authentication", now);
  if (!challenge) return null;

  const [stored] = await db
    .select({
      id: passkeyCredentials.id,
      credentialId: passkeyCredentials.credentialId,
      publicKey: passkeyCredentials.publicKey,
      counter: passkeyCredentials.counter,
      transports: passkeyCredentials.transports,
      profileId: profiles.id,
      role: profiles.role,
    })
    .from(passkeyCredentials)
    .innerJoin(profiles, eq(profiles.id, passkeyCredentials.profileId))
    .where(eq(passkeyCredentials.credentialId, parsed.data.response.id));
  if (!stored) return null;

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: parsed.data.response as unknown as AuthenticationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
        counter: stored.counter,
        transports: stored.transports,
      },
    });
  } catch {
    // Includes a counter that went backwards (a possibly cloned authenticator).
    return null;
  }
  if (!verification.verified) return null;

  await db
    .update(passkeyCredentials)
    .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: now })
    .where(eq(passkeyCredentials.id, stored.id));

  return { id: stored.profileId, role: stored.role };
}

/**
 * Delete expired or used challenges.
 * TODO: call from a cron route protected by CRON_SECRET (not built yet).
 */
export async function pruneWebauthnChallenges(db: Db, now: Date = new Date()): Promise<number> {
  const deleted = await db
    .delete(webauthnChallenges)
    .where(lt(webauthnChallenges.expiresAt, now))
    .returning({ id: webauthnChallenges.id });
  return deleted.length;
}
