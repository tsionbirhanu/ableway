"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { registerLearner, signInSchema } from "@/lib/auth/accounts";
import { signIn } from "@/lib/auth/auth";
import { ConflictError, RateLimitError } from "@/lib/auth/errors";
import { clientIp } from "@/lib/auth/request-ip";
import { getDb } from "@/lib/db/client";
import { firstErrors, type FormState } from "./form-state";

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/**
 * Public actions: anyone can call them, so they validate everything with Zod
 * and are rate limited (inside verifyPasswordLogin and registerLearner).
 * Passwords are never sent back in the form state.
 */
export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = signInSchema.safeParse({
    email: values.email,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the form.",
      fieldErrors: firstErrors(parsed.error),
      values,
    };
  }

  try {
    await signIn("password", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { status: "error", message: new RateLimitError(60).message, values };
    }
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "The email or password is not right. Please try again.",
        values,
      };
    }
    throw error;
  }
  redirect("/");
}

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { name: text(formData, "name"), email: text(formData, "email") };
  const password = text(formData, "password");

  try {
    await registerLearner(getDb(), { ...values, password }, { ip: clientIp(await headers()) });
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: "error",
        message: "Please check the form.",
        fieldErrors: firstErrors(error),
        values,
      };
    }
    if (error instanceof ConflictError || error instanceof RateLimitError) {
      return { status: "error", message: error.message, values };
    }
    throw error;
  }

  await signIn("password", { email: values.email, password, redirect: false });
  redirect("/");
}
