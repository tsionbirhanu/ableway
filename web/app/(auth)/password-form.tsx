"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { ErrorSummary } from "@/components/error-summary";
import { FormField } from "@/components/form-field";
import { signInWithPasskey, takeSignUpPrefill } from "@/lib/passkeys/client";
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
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [prefill, setPrefill] = useState<{ name?: string; email?: string }>({});
  const [passkeyStatus, setPasskeyStatus] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const text = copy[mode];
  const errors = state.fieldErrors ?? {};

  // Name and email saved by /register when this device could not make a passkey.
  useEffect(() => {
    if (mode !== "sign-up") return;
    const saved = takeSignUpPrefill();
    // Read after hydration so server and client render the same first frame.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved.name || saved.email) setPrefill(saved);
  }, [mode]);

  async function handlePasskey() {
    setPasskeyBusy(true);
    setPasskeyStatus("Your device will ask you to unlock it.");
    const result = await signInWithPasskey();
    if (result.ok) {
      setPasskeyStatus("Signed in. Going to the home page.");
      router.push("/");
      router.refresh();
      return;
    }
    setPasskeyBusy(false);
    setPasskeyStatus(result.message);
  }

  return (
    <>
      {mode === "sign-in" ? (
        <section aria-labelledby="passkey-heading" className="passkey-option">
          <h2 id="passkey-heading">Sign in with a passkey</h2>
          <p>No password. Your device asks you to unlock it with your fingerprint, face, or PIN.</p>
          <button
            type="button"
            className="button"
            onClick={handlePasskey}
            disabled={passkeyBusy}
            aria-disabled={passkeyBusy}
          >
            Sign in with a passkey
          </button>
          <p role="status" aria-live="polite" className="form-status">
            {passkeyStatus}
          </p>
          <h2>Or sign in with your password</h2>
        </section>
      ) : null}

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
            key={`name-${prefill.name ?? ""}`}
            defaultValue={state.values?.name ?? prefill.name}
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
          key={`email-${prefill.email ?? ""}`}
          defaultValue={state.values?.email ?? prefill.email}
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
