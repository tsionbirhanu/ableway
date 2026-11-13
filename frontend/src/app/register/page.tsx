'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, CheckCircle2, Shield, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';

export default function RegisterPage() {
  const router = useRouter();
  const { announce } = useA11y();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'en',
    consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'form' | 'confirm' | 'success'>('form');
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your full name. For example: Abebe Bikila.';
    }

    if (!formData.email.trim() || !formData.email.includes('@') || !formData.email.includes('.')) {
      newErrors.email = 'Please enter a valid email address like name@example.com.';
    }

    if (!formData.consent) {
      newErrors.consent = 'You must agree to the plain-language data notice to register.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Rule 16: Move focus to the error summary at the top (role="alert")
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
      announce('The form has errors. Please check the error summary at the top.', 'assertive');
      return;
    }

    setErrors({});
    setCurrentStep('confirm');
    announce(`Please review your details. Name: ${formData.name}. Email: ${formData.email}. Preferred language: ${formData.language}.`);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('success');
    announce('Registration confirmed! Directing you to the course choice page.');
    setTimeout(() => {
      router.push('/courses');
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Heading (Rule 2) */}
      <header className="space-y-2">
        <h1 id="register-h1" className="text-3xl font-extrabold text-white tracking-tight">
          Learner Registration
        </h1>
        <p className="text-slate-200 text-sm leading-relaxed">
          Fill this form using your keyboard or voice. You can ask the Web Assistant (<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-xs">Alt + Shift + V</kbd>) to enter your details by voice.
        </p>
      </header>

      {/* Voice Assistant Tip Banner */}
      <section aria-label="Voice assistance notice" className="p-4 bg-slate-900 border border-slate-700 rounded-2xl flex items-start gap-3">
        <Mic className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-slate-200 space-y-1">
          <p className="font-bold text-white">Voice Form Filling:</p>
          <p>Say <strong className="text-emerald-300">&quot;My name is John&quot;</strong> or <strong className="text-emerald-300">&quot;My email is john@example.com&quot;</strong>. You can also spell letter-by-letter. The assistant enters the text and reads it back.</p>
        </div>
      </section>

      {/* Rule 16: Error Summary at the top (role="alert", focus moved to it) */}
      {Object.keys(errors).length > 0 && (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="error-summary-heading"
          className="p-5 bg-red-950 border-2 border-red-500 rounded-2xl text-white space-y-2 focus:outline-none focus:ring-4 focus:ring-red-400"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-300" aria-hidden="true" />
            <h2 id="error-summary-heading" className="font-bold text-base">
              There is a problem with your form
            </h2>
          </div>
          <ul className="list-disc pl-5 text-xs text-red-200 space-y-1">
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field}>
                <a href={`#reg-${field}`} className="underline hover:text-white font-medium">
                  {msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Registration Form (Rule 1, 15, 17) */}
      {currentStep === 'form' && (
        <form onSubmit={handleReview} noValidate className="space-y-6 bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl">
          <fieldset className="space-y-6 border-0 p-0 m-0">
            <legend className="text-lg font-bold text-white mb-2">Personal Details</legend>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-sm font-bold text-slate-100">
                Full Name <span className="text-emerald-400 font-semibold">(required)</span>
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error name-desc' : 'name-desc'}
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Abebe Bikila"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-base min-h-[44px] focus:outline-none focus:ring-2 ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-emerald-500'
                }`}
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-red-300 font-medium pt-1">
                  {errors.name}
                </p>
              )}
              <p id="name-desc" className="text-xs text-slate-300">
                Type your full name, or speak letter by letter.
              </p>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-sm font-bold text-slate-100">
                Email Address <span className="text-emerald-400 font-semibold">(required)</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error email-desc' : 'email-desc'}
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-base min-h-[44px] focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-emerald-500'
                }`}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-red-300 font-medium pt-1">
                  {errors.email}
                </p>
              )}
              <p id="email-desc" className="text-xs text-slate-300">
                Used for accessible password-free sign-in (magic link or one-time code). No CAPTCHAs.
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="reg-phone" className="block text-sm font-bold text-slate-100">
                Phone Number (optional)
              </label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+251 91 123 4567"
                className="w-full bg-slate-950 border border-slate-600 rounded-xl px-4 py-3 text-white text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-300">For payment helper calls or SMS job alerts.</p>
            </div>

            {/* Preferred Language */}
            <div className="space-y-1.5">
              <label htmlFor="reg-language" className="block text-sm font-bold text-slate-100">
                Preferred Language
              </label>
              <select
                id="reg-language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-600 rounded-xl px-4 py-3 text-white text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="en">English (Default)</option>
                <option value="am">Amharic (አማርኛ)</option>
                <option value="om">Afaan Oromoo</option>
              </select>
            </div>
          </fieldset>

          {/* Plain Language Consent (Rule 15 & 23) */}
          <fieldset className="p-4 bg-slate-950 border border-slate-700 rounded-2xl space-y-3">
            <legend className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Data Privacy Notice</span>
            </legend>
            <p className="text-xs text-slate-200 leading-relaxed">
              We collect your name, email, and preferences only to support your learning and send job alerts. We never sell your data or train external AI on your answers.
            </p>
            <div className="pt-2">
              <label htmlFor="reg-consent" className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  id="reg-consent"
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-600"
                />
                <span className="text-xs text-slate-100 font-medium">
                  I agree to the collection of my details for learning and support. <strong className="text-emerald-400">(required)</strong>
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" className="text-xs text-red-300 font-medium pt-1">
                  {errors.consent}
                </p>
              )}
            </div>
          </fieldset>

          {/* Submit Action (Rule 12: min 44px) */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 min-h-[48px] shadow-lg transition-transform focus:outline-none focus:ring-4 focus:ring-emerald-300"
            >
              <span>Review Details</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Step (Rule 16: explicit confirmation before submission) */}
      {currentStep === 'confirm' && (
        <section aria-labelledby="confirm-heading" className="space-y-6 bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl">
          <div className="space-y-1">
            <h2 id="confirm-heading" className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Confirm Your Registration Details</span>
            </h2>
            <p className="text-xs text-slate-200">
              Please check your information before saving your account.
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-700 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-300">Full Name</dt>
              <dd className="font-bold text-white mt-0.5">{formData.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-300">Email Address</dt>
              <dd className="font-bold text-white mt-0.5">{formData.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-300">Phone</dt>
              <dd className="font-bold text-white mt-0.5">{formData.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-300">Language</dt>
              <dd className="font-bold text-white mt-0.5 uppercase">{formData.language}</dd>
            </div>
          </dl>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep('form')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 px-4 rounded-xl text-sm min-h-[44px] flex items-center justify-center border border-slate-600"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              <span>Confirm & Submit</span>
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Success State */}
      {currentStep === 'success' && (
        <section aria-labelledby="success-heading" className="p-8 bg-emerald-950/80 border border-emerald-700 rounded-3xl text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" aria-hidden="true" />
          <h2 id="success-heading" className="text-2xl font-bold text-white">Welcome to Ableway!</h2>
          <p className="text-sm text-slate-200">
            Your account has been created. Redirecting to the <strong>Course Choice</strong> page...
          </p>
        </section>
      )}
    </div>
  );
}
