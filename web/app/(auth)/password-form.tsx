"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ErrorSummary } from "@/components/error-summary";
import { FormField } from "@/components/form-field";
import { initialFormState, type FormState } from "./form-state";

type Mode = "sign-in" | "sign-up";

type PasswordFormProps = {
  mode: Mode;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

const copy = {
  "sign-in": {
    submit: "Sign in",
    pending: "Signing in, please wait.",
    passwordHint: undefined,
    switchText: "New to Ableway?",
    switchLink: { href: "/sign-up", label: "Create an account" },
  },
  "sign-up": {
    submit: "Create account",
    pending: "Creating your account, please wait.",
    passwordHint: "At least 8 characters. A short sentence is easy to remember and hard to guess.",
    switchText: "Already have an account?",
    switchLink: { href: "/sign-in", label: "Sign in" },
  },
} as const;

/** Sign-in and sign-up form. Works without JavaScript (plain form post). */
export function PasswordForm({ mode, action }: PasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const text = copy[mode];
  const errors = state.fieldErrors ?? {};

  return (
    <>
      {state.status === "error" ? (
        <ErrorSummary
          message={state.message}
          fieldErrors={errors}
          fieldIds={{ name: "name", email: "email", password: "password" }}
        />
      ) : null}

      <form action={formAction} noValidate>
        {mode === "sign-up" ? (
          <FormField
            id="name"
            name="name"
            label="Your name"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
            error={errors.name}
          />
        ) : null}
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          defaultValue={state.values?.email}
          error={errors.email}
        />
        <FormField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          hint={text.passwordHint}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          error={errors.password}
        />
        <div className="field field-checkbox">
          <input
            id="show-password"
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <label htmlFor="show-password">Show password</label>
        </div>

        <button type="submit" className="button" disabled={pending} aria-disabled={pending}>
          {text.submit}
        </button>
        <p role="status" aria-live="polite" className="form-status">
          {pending ? text.pending : ""}
        </p>
      </form>

      <p>
        {text.switchText} <Link href={text.switchLink.href}>{text.switchLink.label}</Link>
      </p>
    </>
  );
}
