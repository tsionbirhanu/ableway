import type { Metadata } from "next";
import { signUpAction } from "../actions";
import { PasswordForm } from "../password-form";

export const metadata: Metadata = { title: "Create an account - Ableway" };

export default function SignUpPage() {
  return (
    <main id="main" tabIndex={-1}>
      <h1>Create an account</h1>
      <p>It takes about one minute. You need an email address.</p>
      <PasswordForm mode="sign-up" action={signUpAction} />
    </main>
  );
}
