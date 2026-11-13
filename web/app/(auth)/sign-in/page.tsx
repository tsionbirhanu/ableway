import type { Metadata } from "next";
import { signInAction } from "../actions";
import { PasswordForm } from "../password-form";

export const metadata: Metadata = { title: "Sign in - Ableway" };

export default function SignInPage() {
  return (
    <main id="main" tabIndex={-1}>
      <h1>Sign in</h1>
      <p>Enter your email and password.</p>
      <PasswordForm mode="sign-in" action={signInAction} />
      {/* TODO: self-service reset needs an email provider. Link to the help page once it exists. */}
      <p>Forgot your password? A helper can reset it for you.</p>
    </main>
  );
}
