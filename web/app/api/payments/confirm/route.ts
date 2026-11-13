import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { auditLog, courses, enrollments, paymentMethod, paymentRecords } from "@/lib/db/schema";
import { BadRequestError, ConflictError, NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { canConfirmPayment } from "@/lib/auth/policies";
import { authorize, requireRole } from "@/lib/auth/session";

/**
 * Strict: unknown fields are rejected. So nobody can send card numbers,
 * PINs or mobile-money passwords here, even by mistake.
 */
const body = z.strictObject({
  enrollmentId: z.uuid(),
  amountMinor: z.number().int().positive().max(100_000_000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  method: z.enum(paymentMethod.enumValues),
});

/**
 * A helper confirms a payment they completed with the learner.
 * Records the payment, activates the enrollment, and writes an audit entry,
 * all in one transaction.
 */
export const POST = withErrors(async (request: Request) => {
  const actor = await requireRole(["helper", "admin"]);
  const input = body.parse(await readJson(request));

  const result = await getDb().transaction(async (tx) => {
    const [enrollment] = await tx
      .select({
        id: enrollments.id,
        profileId: enrollments.profileId,
        status: enrollments.status,
        currency: courses.currency,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.id, input.enrollmentId))
      .for("update", { of: enrollments });
    if (!enrollment) throw new NotFoundError("We could not find that enrollment.");

    authorize(canConfirmPayment(actor, enrollment));

    if (enrollment.status !== "pending_payment") {
      throw new ConflictError("This enrollment is not waiting for payment.");
    }
    if (enrollment.currency !== input.currency) {
      throw new BadRequestError(`This course is paid in ${enrollment.currency}.`);
    }

    const now = new Date();
    const [payment] = await tx
      .insert(paymentRecords)
      .values({ ...input, confirmedBy: actor.id, confirmedAt: now })
      .returning({ id: paymentRecords.id });
    await tx
      .update(enrollments)
      .set({ status: "active" })
      .where(and(eq(enrollments.id, enrollment.id), eq(enrollments.status, "pending_payment")));
    await tx.insert(auditLog).values({
      actorId: actor.id,
      action: "payment.confirmed",
      target: `enrollments:${enrollment.id}`,
      metadata: {
        paymentId: payment?.id ?? null,
        method: input.method,
        amountMinor: input.amountMinor,
      },
    });
    return { paymentId: payment?.id, enrollmentId: enrollment.id, status: "active" as const };
  });

  return Response.json({ payment: result }, { status: 201 });
});
