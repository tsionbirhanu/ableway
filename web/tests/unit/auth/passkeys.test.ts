import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { ConflictError, RateLimitError } from "@/lib/auth/errors";
import {
  CHALLENGE_TTL_MS,
  finishPasskeyRegistration,
  finishPasskeySignIn,
  pruneWebauthnChallenges,
  relyingPartyFromAppUrl,
  startPasskeyRegistration,
  startPasskeySignIn,
} from "@/lib/auth/passkeys";
import { auditLog, passkeyCredentials, profiles, webauthnChallenges } from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";

/**
 * Real: option generation, challenges, database writes, rate limits.
 * Faked: the two signature checks, because a unit test has no real
 * authenticator to sign with. Each test says what the check returns.
 */
vi.mock("@simplewebauthn/server", async (importOriginal) => {
  const real = await importOriginal<typeof import("@simplewebauthn/server")>();
  return {
    ...real,
    verifyRegistrationResponse: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
  };
});

const verifyRegistration = vi.mocked(verifyRegistrationResponse);
const verifyAuthentication = vi.mocked(verifyAuthenticationResponse);

const rp = relyingPartyFromAppUrl("http://localhost:3000");
let t: TestDb;
let ipCounter = 0;
const freshIp = () => `198.51.100.${++ipCounter}`;

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

beforeEach(() => {
  verifyRegistration.mockReset();
  verifyAuthentication.mockReset();
});

const details = { name: "Meron Tesfaye", email: "Meron@Example.org", language: "am" };

/** A browser response shaped like the real thing. */
const browserResponse = (credentialId: string) => ({
  id: credentialId,
  rawId: credentialId,
  type: "public-key",
  response: { clientDataJSON: "e30", attestationObject: "AA" },
  clientExtensionResults: {},
});

function registrationVerified(credentialId: string) {
  // Drop results queued but never used by an earlier test.
  verifyRegistration.mockReset();
  verifyRegistration.mockResolvedValueOnce({
    verified: true,
    registrationInfo: {
      credential: {
        id: credentialId,
        publicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 0,
        transports: ["internal", "hybrid"],
      },
      credentialDeviceType: "multiDevice",
      credentialBackedUp: true,
    },
  } as unknown as Awaited<ReturnType<typeof verifyRegistrationResponse>>);
}

async function registerLearner(email: string, credentialId: string) {
  const started = await startPasskeyRegistration(
    t.db,
    { ...details, email },
    { ip: freshIp(), rp },
  );
  registrationVerified(credentialId);
  const actor = await finishPasskeyRegistration(
    t.db,
    { challengeId: started.challengeId, response: browserResponse(credentialId) },
    { ip: freshIp(), rp },
  );
  if (!actor) throw new Error("registration failed");
  return actor;
}

describe("relyingPartyFromAppUrl", () => {
  it("uses the host as the passkey's site, so passkeys only work on Ableway", () => {
    expect(relyingPartyFromAppUrl("https://learn.ableway.org/")).toEqual({
      id: "learn.ableway.org",
      name: "Ableway",
      origin: "https://learn.ableway.org",
    });
  });
});

describe("startPasskeyRegistration", () => {
  it("returns options that require a discoverable passkey and a device unlock", async () => {
    const { challengeId, options } = await startPasskeyRegistration(
      t.db,
      { ...details, email: "options@example.org" },
      { ip: freshIp(), rp },
    );
    expect(options.rp).toEqual({ id: "localhost", name: "Ableway" });
    expect(options.user.name).toBe("options@example.org");
    expect(options.user.displayName).toBe("Meron Tesfaye");
    expect(options.authenticatorSelection?.residentKey).toBe("required");
    expect(options.authenticatorSelection?.userVerification).toBe("required");
    expect(options.attestation).toBe("none");

    const [row] = await t.db
      .select()
      .from(webauthnChallenges)
      .where(eq(webauthnChallenges.id, challengeId));
    expect(row?.challenge).toBe(options.challenge);
    expect(row?.purpose).toBe("registration");
    expect(row?.pendingProfile?.email).toBe("options@example.org");
  });

  it("does not put the email in the passkey's user handle", async () => {
    const { options } = await startPasskeyRegistration(
      t.db,
      { ...details, email: "handle@example.org" },
      { ip: freshIp(), rp },
    );
    expect(Buffer.from(options.user.id, "base64url").toString()).not.toContain("handle@");
  });

  it("validates details with plain-language messages", async () => {
    const start = (input: object) =>
      startPasskeyRegistration(t.db, { ...details, ...input }, { ip: freshIp(), rp });
    await expect(start({ name: "  " })).rejects.toBeInstanceOf(ZodError);
    await expect(start({ email: "not-an-email" })).rejects.toThrow(/full email address/);
    await expect(start({ phone: "0911 234 567" })).rejects.toThrow(/country code/);
    await expect(start({ role: "admin" })).rejects.toBeInstanceOf(ZodError);
  });

  it("accepts a spoken phone number with spaces and normalises it", async () => {
    const { challengeId } = await startPasskeyRegistration(
      t.db,
      { ...details, email: "phone@example.org", phone: "+251 911 234 567" },
      { ip: freshIp(), rp },
    );
    const [row] = await t.db
      .select()
      .from(webauthnChallenges)
      .where(eq(webauthnChallenges.id, challengeId));
    expect(row?.pendingProfile?.phone).toBe("+251911234567");
  });

  it("refuses an email that already has an account", async () => {
    await registerLearner("taken@example.org", "cred-taken");
    await expect(
      startPasskeyRegistration(
        t.db,
        { ...details, email: "TAKEN@example.org" },
        { ip: freshIp(), rp },
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("is rate limited per email", async () => {
    const email = "limited@example.org";
    for (let i = 0; i < 3; i++) {
      await startPasskeyRegistration(t.db, { ...details, email }, { ip: freshIp(), rp });
    }
    await expect(
      startPasskeyRegistration(t.db, { ...details, email }, { ip: freshIp(), rp }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("finishPasskeyRegistration", () => {
  it("creates a learner, stores only the public key, and writes an audit entry", async () => {
    const actor = await registerLearner("new@example.org", "cred-new");
    expect(actor.role).toBe("learner");

    const [profile] = await t.db.select().from(profiles).where(eq(profiles.id, actor.id));
    expect(profile).toMatchObject({
      name: "Meron Tesfaye",
      email: "new@example.org",
      language: "am",
    });

    const [cred] = await t.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.profileId, actor.id));
    expect(cred).toMatchObject({
      credentialId: "cred-new",
      publicKey: Buffer.from([1, 2, 3, 4]).toString("base64url"),
      counter: 0,
      transports: ["internal", "hybrid"],
      deviceType: "multiDevice",
      backedUp: true,
    });

    const [audit] = await t.db.select().from(auditLog).where(eq(auditLog.actorId, actor.id));
    expect(audit?.metadata).toEqual({ method: "passkey" });
  });

  it("checks the right challenge, site, and that the device was unlocked", async () => {
    const started = await startPasskeyRegistration(
      t.db,
      { ...details, email: "checks@example.org" },
      { ip: freshIp(), rp },
    );
    registrationVerified("cred-checks");
    await finishPasskeyRegistration(
      t.db,
      { challengeId: started.challengeId, response: browserResponse("cred-checks") },
      { ip: freshIp(), rp },
    );
    expect(verifyRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: started.options.challenge,
        expectedOrigin: "http://localhost:3000",
        expectedRPID: "localhost",
        requireUserVerification: true,
      }),
    );
  });

  it("uses each challenge once and clears the stored details", async () => {
    const started = await startPasskeyRegistration(
      t.db,
      { ...details, email: "once@example.org" },
      { ip: freshIp(), rp },
    );
    registrationVerified("cred-once");
    const input = { challengeId: started.challengeId, response: browserResponse("cred-once") };
    expect(await finishPasskeyRegistration(t.db, input, { ip: freshIp(), rp })).not.toBeNull();

    registrationVerified("cred-once-again");
    expect(await finishPasskeyRegistration(t.db, input, { ip: freshIp(), rp })).toBeNull();

    const [row] = await t.db
      .select()
      .from(webauthnChallenges)
      .where(eq(webauthnChallenges.id, started.challengeId));
    expect(row?.usedAt).toBeInstanceOf(Date);
    expect(row?.pendingProfile).toBeNull();
  });

  it("refuses an expired challenge", async () => {
    const past = new Date(Date.now() - CHALLENGE_TTL_MS - 1000);
    const started = await startPasskeyRegistration(
      t.db,
      { ...details, email: "expired@example.org" },
      { ip: freshIp(), rp, now: past },
    );
    registrationVerified("cred-expired");
    const actor = await finishPasskeyRegistration(
      t.db,
      { challengeId: started.challengeId, response: browserResponse("cred-expired") },
      { ip: freshIp(), rp },
    );
    expect(actor).toBeNull();
    expect(verifyRegistration).not.toHaveBeenCalled();
  });

  it("creates nothing when the passkey does not verify", async () => {
    const started = await startPasskeyRegistration(
      t.db,
      { ...details, email: "unverified@example.org" },
      { ip: freshIp(), rp },
    );
    verifyRegistration.mockResolvedValueOnce({ verified: false });
    const input = { challengeId: started.challengeId, response: browserResponse("cred-bad") };
    expect(await finishPasskeyRegistration(t.db, input, { ip: freshIp(), rp })).toBeNull();

    verifyRegistration.mockRejectedValueOnce(new Error("bad signature"));
    expect(await finishPasskeyRegistration(t.db, input, { ip: freshIp(), rp })).toBeNull();

    const found = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.email, "unverified@example.org"));
    expect(found).toHaveLength(0);
  });

  it("returns null for malformed input instead of throwing", async () => {
    const opts = { ip: freshIp(), rp };
    expect(await finishPasskeyRegistration(t.db, null, opts)).toBeNull();
    expect(
      await finishPasskeyRegistration(t.db, { challengeId: "x", response: {} }, opts),
    ).toBeNull();
  });

  it("cannot be used with a sign-in challenge", async () => {
    const started = await startPasskeySignIn(t.db, { ip: freshIp(), rp });
    registrationVerified("cred-wrong-purpose");
    const actor = await finishPasskeyRegistration(
      t.db,
      { challengeId: started.challengeId, response: browserResponse("cred-wrong-purpose") },
      { ip: freshIp(), rp },
    );
    expect(actor).toBeNull();
  });
});

describe("passkey sign-in", () => {
  let learner: { id: string };

  beforeAll(async () => {
    learner = await registerLearner("signin@example.org", "cred-signin");
  });

  function authenticationVerified(newCounter: number) {
    verifyAuthentication.mockReset();
    verifyAuthentication.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter },
    } as unknown as Awaited<ReturnType<typeof verifyAuthenticationResponse>>);
  }

  async function signIn(credentialId: string) {
    const started = await startPasskeySignIn(t.db, { ip: freshIp(), rp });
    return finishPasskeySignIn(
      t.db,
      { challengeId: started.challengeId, response: browserResponse(credentialId) },
      { ip: freshIp(), rp },
    );
  }

  it("asks for any passkey on the device (no email needed) and a device unlock", async () => {
    const { options } = await startPasskeySignIn(t.db, { ip: freshIp(), rp });
    expect(options.rpId).toBe("localhost");
    expect(options.userVerification).toBe("required");
    expect(options.allowCredentials ?? []).toEqual([]);
  });

  it("signs in with a verified passkey and updates the counter", async () => {
    authenticationVerified(7);
    expect(await signIn("cred-signin")).toEqual({ id: learner.id, role: "learner" });

    const [cred] = await t.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, "cred-signin"));
    expect(cred?.counter).toBe(7);
    expect(cred?.lastUsedAt).toBeInstanceOf(Date);
  });

  it("checks the signature against the stored public key and counter", async () => {
    authenticationVerified(8);
    await signIn("cred-signin");
    expect(verifyAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedOrigin: "http://localhost:3000",
        expectedRPID: "localhost",
        requireUserVerification: true,
        credential: expect.objectContaining({
          id: "cred-signin",
          publicKey: new Uint8Array([1, 2, 3, 4]),
          counter: 7,
        }),
      }),
    );
  });

  it("returns null for an unknown passkey", async () => {
    expect(await signIn("cred-unknown")).toBeNull();
    expect(verifyAuthentication).not.toHaveBeenCalled();
  });

  it("returns null when the signature does not verify (including a cloned device)", async () => {
    verifyAuthentication.mockResolvedValueOnce({ verified: false } as never);
    expect(await signIn("cred-signin")).toBeNull();
    verifyAuthentication.mockRejectedValueOnce(new Error("counter went backwards"));
    expect(await signIn("cred-signin")).toBeNull();
  });

  it("uses each sign-in challenge once", async () => {
    const started = await startPasskeySignIn(t.db, { ip: freshIp(), rp });
    const input = { challengeId: started.challengeId, response: browserResponse("cred-signin") };
    authenticationVerified(9);
    expect(await finishPasskeySignIn(t.db, input, { ip: freshIp(), rp })).not.toBeNull();
    authenticationVerified(10);
    expect(await finishPasskeySignIn(t.db, input, { ip: freshIp(), rp })).toBeNull();
  });

  it("uses the role from the database", async () => {
    await t.db.update(profiles).set({ role: "helper" }).where(eq(profiles.id, learner.id));
    authenticationVerified(11);
    expect((await signIn("cred-signin"))?.role).toBe("helper");
    await t.db.update(profiles).set({ role: "learner" }).where(eq(profiles.id, learner.id));
  });

  it("rate limits finishing per IP", async () => {
    const ip = freshIp();
    for (let i = 0; i < 30; i++) {
      await finishPasskeySignIn(
        t.db,
        { challengeId: crypto.randomUUID(), response: browserResponse("x") },
        { ip, rp },
      );
    }
    await expect(
      finishPasskeySignIn(
        t.db,
        { challengeId: crypto.randomUUID(), response: browserResponse("x") },
        { ip, rp },
      ),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("pruneWebauthnChallenges", () => {
  it("deletes expired challenges only", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const deleted = await pruneWebauthnChallenges(t.db, future);
    expect(deleted).toBeGreaterThan(0);
    const fresh = await startPasskeySignIn(t.db, { ip: freshIp(), rp });
    expect(await pruneWebauthnChallenges(t.db)).toBe(0);
    const [row] = await t.db
      .select()
      .from(webauthnChallenges)
      .where(eq(webauthnChallenges.id, fresh.challengeId));
    expect(row).toBeDefined();
  });
});
