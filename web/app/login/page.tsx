"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useA11y } from "@/lib/a11y/a11y-context";
import { playEarcon } from "@/lib/audio/earcons";
import { getTranslation } from "@/lib/i18n/translations";
import { signInWithPasswordAction } from "@/app/(auth)/passkey-actions";
import { signInWithPasskey } from "@/lib/passkeys/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { announce, language } = useA11y();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const t = getTranslation(language);

  // Mode: standard login vs accessible experience
  const [isAccessibleMode, setIsAccessibleMode] = useState(
    searchParams.get("mode") === "accessible" || searchParams.get("accessible") === "true",
  );

  // Standard ALX login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accessible OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    document.title = "Sign In - ALX Learning Portal";
    announce(
      "Sign in page loaded. Sign in with your email and password, or switch to the accessible experience for one-time code sign in or voice registration.",
      "polite",
    );
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [announce]);

  // Handle standard ALX email/password submission
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      playEarcon("error");
      announce("Please enter a valid email address", "assertive");
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError("Please enter your password (at least 6 characters)");
      playEarcon("error");
      announce("Please enter your password", "assertive");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await signInWithPasswordAction(email, password);
    if (!result.ok) {
      setIsSubmitting(false);
      setError(result.message);
      playEarcon("error");
      announce(result.message, "assertive");
      return;
    }
    playEarcon("success");
    announce("Sign in successful. Redirecting to your learning portal...", "polite");
    router.push("/courses");
    router.refresh();
  };

  // Sign in with a passkey: the device asks the learner to unlock it. No email or password needed.
  const handlePasskeySignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    announce("Your device will ask you to unlock it.", "polite");
    const result = await signInWithPasskey();
    if (!result.ok) {
      setIsSubmitting(false);
      setError(result.message);
      playEarcon("error");
      announce(result.message, "assertive");
      return;
    }
    playEarcon("success");
    announce("Sign in successful. Going to courses...", "polite");
    router.push("/courses");
    router.refresh();
  };

  // Handle Accessible OTP send code
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail.trim())) {
      setError("Please enter a valid email address for one-time code delivery");
      playEarcon("error");
      announce("Please enter a valid email address for code delivery", "assertive");
      return;
    }
    setError(null);
    setOtpSent(true);
    playEarcon("success");
    announce(`One-time code sent to ${otpEmail}. For demonstration, enter 123456.`, "polite");
  };

  // Handle Accessible OTP verify code
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError("Please enter the 6-digit one-time code sent to your email");
      playEarcon("error");
      announce("Please enter your one-time code", "assertive");
      return;
    }
    setIsSubmitting(true);
    playEarcon("success");
    announce("Accessible sign in successful. Loading courses...", "polite");
    setTimeout(() => {
      router.push("/courses");
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#050B17] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 25%, rgba(147, 51, 234, 0.25) 0%, rgba(37, 99, 235, 0.15) 35%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10 bg-white rounded-3xl p-7 sm:p-10 shadow-2xl space-y-6 text-slate-900">
        {/* Brand & Heading */}
        <header className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-baseline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-1"
            aria-label="Ableway home"
          >
            <span className="text-3xl font-black tracking-tight text-slate-950 font-sans leading-none">
              al<span className="text-orange-500">x</span>
            </span>
          </Link>

          <h1
            ref={h1Ref}
            tabIndex={-1}
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight focus:outline-none"
          >
            {t.login?.title || "Sign in to your account"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isAccessibleMode
              ? "Accessible portal for voice registration and password-free login."
              : t.login?.subtitle || "Welcome back! Enter your details to access your portal."}
          </p>
        </header>

        {/* Mode Selector Tabs (No stroke, clean surface) */}
        <div
          className="bg-slate-100 p-1 rounded-2xl flex text-xs font-semibold"
          role="tablist"
          aria-label="Sign In Method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isAccessibleMode}
            onClick={() => {
              setIsAccessibleMode(false);
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center font-bold cursor-pointer min-h-[40px] ${
              !isAccessibleMode
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Standard Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isAccessibleMode}
            onClick={() => {
              setIsAccessibleMode(true);
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center font-bold cursor-pointer min-h-[40px] ${
              isAccessibleMode
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Accessible Experience
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-50 rounded-xl text-rose-900 text-xs sm:text-sm font-semibold"
          >
            {error}
          </div>
        )}

        {/* 1. STANDARD SIGN IN */}
        {!isAccessibleMode ? (
          <div className="space-y-6">
            <form onSubmit={handleStandardSubmit} noValidate className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t.login?.emailLabel || "Email address"}{" "}
                  <span className="text-orange-700 font-normal normal-case">(required)</span>
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-base focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {t.login?.passwordLabel || "Password"}{" "}
                    <span className="text-orange-700 font-normal normal-case">(required)</span>
                  </label>
                  <a
                    href="#forgot-password"
                    className="text-xs font-semibold text-orange-700 hover:text-orange-900 underline focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
                  >
                    {t.login?.forgotPassword || "Forgot password?"}
                  </a>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-base focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center pt-1">
                <label
                  htmlFor="remember-me"
                  className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 min-h-[44px]"
                >
                  <input
                    id="remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-orange-600 accent-orange-500 focus:ring-orange-400"
                  />
                  <span>{t.login?.rememberMe || "Remember me for 30 days"}</span>
                </label>
              </div>

              {/* Sign In Button (Solid, No Stroke) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] bg-orange-500 hover:bg-orange-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 cursor-pointer text-sm"
              >
                <span>
                  {isSubmitting
                    ? t.login?.signingIn || "Signing in..."
                    : t.login?.signInBtn || "Sign In"}
                </span>
              </button>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold">
                    {t.login?.orContinueWith || "Or continue with"}
                  </span>
                </div>
              </div>

              {/* Google SSO Button (Solid Soft Surface, No Stroke) */}
              <button
                type="button"
                onClick={() => {
                  announce("Redirecting to Google authentication...", "polite");
                  setTimeout(() => router.push("/courses"), 1000);
                }}
                className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{t.login?.googleSignIn || "Continue with Google"}</span>
              </button>
            </form>

            {/* Direct Gateway to Accessible Experience */}
            <div className="bg-slate-50 rounded-2xl p-5 text-center space-y-3">
              <h2 className="text-sm font-bold text-slate-900">
                {t.login?.a11yCalloutTitle || "Need an Accessible Experience?"}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.login?.a11yCalloutDesc ||
                  "Ableway provides blind and visually impaired learners with hands-free spoken voice dialog, screen reader optimization, and zero CAPTCHAs."}
              </p>
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={isSubmitting}
                className="w-full min-h-[40px] py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-semibold border border-slate-300 text-xs flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                Go to Accessible Experience
              </button>
            </div>
          </div>
        ) : (
          /* 2. ACCESSIBLE EXPERIENCE PORTAL */
          <div className="space-y-6">
            {/* Section A: New to Ableway? Register with Voice */}
            <section
              aria-labelledby="accessible-register-heading"
              className="bg-slate-50 rounded-2xl p-5 space-y-3"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 block">
                New Learner
              </span>
              <h2 id="accessible-register-heading" className="text-base font-bold text-slate-900">
                Create an Account with Voice
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our spoken assistant guides you hands-free step-by-step. Speak your details
                naturally, spell if needed, and confirm before saving. No CAPTCHAs.
              </p>
              <Link
                href="/register"
                id="link-to-register"
                className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {t.login?.a11yRegisterBtn || "Create Account"}
              </Link>
            </section>

            {/* Section B: Already have an account? Sign In with One-Time Code */}
            <section
              aria-labelledby="accessible-login-heading"
              className="bg-slate-50 rounded-2xl p-5 space-y-4"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Existing Learner
              </span>
              <h2 id="accessible-login-heading" className="text-base font-bold text-slate-900">
                Sign In with One-Time Code
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Password-free accessible login. Enter your email and we will send a 6-digit one-time
                code. No passwords or visual puzzles to solve.
              </p>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} noValidate className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="otp-email"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Email address{" "}
                      <span className="text-orange-700 font-normal normal-case">(required)</span>
                    </label>
                    <input
                      id="otp-email"
                      type="email"
                      autoComplete="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full min-h-[44px] bg-[#0B132B] hover:bg-[#152248] text-orange-400 font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 cursor-pointer"
                  >
                    Send One-Time Code
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} noValidate className="space-y-3">
                  <div className="bg-white rounded-xl p-3 text-xs text-slate-700">
                    Code sent to <strong>{otpEmail}</strong>. (For demonstration, enter{" "}
                    <strong>123456</strong>)
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="otp-code"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      6-Digit Code{" "}
                      <span className="text-orange-700 font-normal normal-case">(required)</span>
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-base font-mono tracking-widest text-center focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 cursor-pointer"
                  >
                    {isSubmitting ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>
              )}
            </section>

            {/* Back to Standard Login */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsAccessibleMode(false)}
                className="text-xs text-slate-500 hover:text-slate-800 underline focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1 min-h-[36px]"
              >
                Switch back to standard password login
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="text-center text-[11px] text-slate-400 pt-2">
          WCAG 2.2 AA / AAA accessible authentication for Ableway &amp; ALX
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050B17] flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
