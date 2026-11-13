import { eq } from "drizzle-orm";
import { z } from "zod";
import { auditLog, passwordCredentials, profiles } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { ConflictError } from "./errors";
import {
  DEFAULT_SCRYPT,
  getDummyHash,
  hashPassword,
  needsRehash,
  newPasswordSchema,
  verifyPassword,
  type ScryptParams,
} from "./password";
import { enforce, hashKeyPart, LIMITS } from "./rate-limit";
import type { Actor } from "./roles";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Please enter a full email address, like name@example.com." }).max(254));

export const signInSchema = z.object({
  email: emailSchema,
  // Do not apply new-password rules at sign-in: old passwords must still work.
  password: z.string().min(1, { error: "Please enter your password." }).max(1024),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Please tell us your name." })
    .max(100, { error: "Please use a shorter name." }),
  email: emailSchema,
  password: newPasswordSchema,
});

export type SignUpInput = z.input<typeof signUpSchema>;

type Options = { ip: string; now?: Date; scrypt?: ScryptParams };

/**
 * Check an email and password. Returns the actor, or null for any failure.
 * Never says whether the email exists. Rate limited per email and per IP.
 */
export async function verifyPasswordLogin(
  db: Db,
  input: unknown,
  { ip, now, scrypt = DEFAULT_SCRYPT }: Options,
): Promise<Actor | null> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  await enforce(
    db,
    [
      { key: `signin:email:${hashKeyPart(email)}`, limit: LIMITS.signInPerEmail },
      { key: `signin:ip:${hashKeyPart(ip)}`, limit: LIMITS.signInPerIp },
    ],
    now,
  );

  const [row] = await db
    .select({
      id: profiles.id,
      role: profiles.role,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(profiles)
    .innerJoin(passwordCredentials, eq(passwordCredentials.profileId, profiles.id))
    .where(eq(profiles.email, email));

  if (!row) {
    // Same work as a real check, so timing does not reveal unknown emails.
    await verifyPassword(password, await getDummyHash(scrypt));
    return null;
  }

  if (!(await verifyPassword(password, row.passwordHash))) return null;

  if (needsRehash(row.passwordHash, scrypt)) {
    await db
      .update(passwordCredentials)
      .set({ passwordHash: await hashPassword(password, scrypt) })
      .where(eq(passwordCredentials.profileId, row.id));
  }

  return { id: row.id, role: row.role };
}

/**
 * Create a learner account. The role is always "learner": nobody can sign
 * up as a helper or admin. Admins change roles later.
 */
export async function registerLearner(
  db: Db,
  input: unknown,
  { ip, now, scrypt = DEFAULT_SCRYPT }: Options,
): Promise<Actor> {
  const { name, email, password } = signUpSchema.parse(input);

  await enforce(
    db,
    [
      { key: `signup:email:${hashKeyPart(email)}`, limit: LIMITS.signUpPerEmail },
      { key: `signup:ip:${hashKeyPart(ip)}`, limit: LIMITS.signUpPerIp },
    ],
    now,
  );

  const passwordHash = await hashPassword(password, scrypt);

  return db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(profiles)
      .values({ name, email, role: "learner" })
      .onConflictDoNothing({ target: profiles.email })
      .returning({ id: profiles.id, role: profiles.role });
    if (!profile) {
      throw new ConflictError("This email already has an account. Please sign in instead.");
    }
    await tx.insert(passwordCredentials).values({ profileId: profile.id, passwordHash });
    await tx.insert(auditLog).values({
      actorId: profile.id,
      action: "account.created",
      target: `profiles:${profile.id}`,
      metadata: { method: "password" },
    });
    return profile;
  });
}
