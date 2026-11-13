'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, CheckCircle2, Shield, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
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

  const [currentStep, setCurrentStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      announce('Please provide your name and email address to continue.');
      return;
    }
    if (!formData.consent) {
      announce('Please review the plain language data consent before proceeding.');
      return;
    }
    setCurrentStep('confirm');
    announce(`Please review your details. Name: ${formData.name}. Email: ${formData.email}. Phone: ${formData.phone || 'None'}. Preferred language: ${formData.language}.`);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('success');
    setMagicLinkSent(true);
    announce('Registration successful! A magic sign-in code has been prepared. Redirecting you to the course choice page.');
    setTimeout(() => {
      router.push('/courses');
    }, 2500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
          <span>FR-2.1 to FR-2.8: Spoken & Accessible Registration</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Learner Registration</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          You can complete this form manually using your keyboard or screen reader, or use the Web Assistant (<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-xs">Alt + V</kbd>) to speak your answers one by one.
        </p>
      </header>

      {/* Voice Assistant Form Filling Guidance Banner */}
      <section aria-label="Voice assistance instructions" className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3">
        <Mic className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Voice Form Assistance Enabled:</p>
          <p>You can say <strong className="text-emerald-300">"My name is John"</strong>, <strong className="text-emerald-300">"My email is john@example.com"</strong>, or spell letter-by-letter (e.g., <strong className="text-emerald-300">"J-O-H-N"</strong>). The assistant fills the field and reads the value back for your confirmation.</p>
        </div>
      </section>

      {/* Registration Form */}
      {currentStep === 'form' && (
        <form onSubmit={handleReview} className="space-y-6 bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="reg-name" className="block text-sm font-semibold text-slate-200">
              Full Name <span className="text-emerald-400" aria-hidden="true">*</span>
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Abebe Bikila"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-describedby="name-desc"
            />
            <p id="name-desc" className="text-xs text-slate-400">
              Speak or type your full legal or preferred name. Supports letter-by-letter spelling.
            </p>
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-200">
              Email Address <span className="text-emerald-400" aria-hidden="true">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. learner@example.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-describedby="email-desc"
            />
            <p id="email-desc" className="text-xs text-slate-400">
              Used for accessible password-less sign-in (magic link or one-time code). No visual CAPTCHAs.
            </p>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label htmlFor="reg-phone" className="block text-sm font-semibold text-slate-200">
              Phone Number (Optional for SMS / Helper Calls)
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+251 91 123 4567"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Preferred Language */}
          <div className="space-y-2">
            <label htmlFor="reg-lang" className="block text-sm font-semibold text-slate-200">
              Preferred Language for Audio and Assistant
            </label>
            <select
              id="reg-lang"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="en">English (Default)</option>
              <option value="am">Amharic (አማርኛ)</option>
              <option value="om">Afaan Oromoo</option>
            </select>
          </div>

          {/* Plain-Language Data Consent (FR-2.7) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Plain-Language Data Privacy Notice</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We collect your name, contact information, and accessibility preferences solely to customize your learning journey, provide human payment assistance, and send relevant job alerts. We never sell your data or use your personal answers to train third-party AI models.
            </p>
            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleChange}
                required
                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs text-slate-200">
                I understand and agree to the collection of my details for platform learning and support. <span className="text-emerald-400">*</span>
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-900/30 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
            >
              <span>Review & Confirm Details</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Step (FR-1.6, FR-2.2 - explicit confirmation before submitting) */}
      {currentStep === 'confirm' && (
        <div className="space-y-6 bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Confirm Your Registration Details</span>
            </h2>
            <p className="text-xs text-slate-300">
              The assistant requires explicit confirmation before creating your account.
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Full Name</dt>
              <dd className="font-semibold text-white mt-0.5">{formData.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Email Address</dt>
              <dd className="font-semibold text-white mt-0.5">{formData.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Phone</dt>
              <dd className="font-semibold text-white mt-0.5">{formData.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Language</dt>
              <dd className="font-semibold text-white mt-0.5 uppercase">{formData.language}</dd>
            </div>
          </dl>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep('form')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl text-sm"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <span>Confirm & Submit</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Redirect State (FR-2.8) */}
      {currentStep === 'success' && (
        <div className="p-8 bg-emerald-950/60 border border-emerald-800 rounded-3xl text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Welcome to Ableway!</h2>
          <p className="text-sm text-slate-300">
            Your account is set up. Redirecting you to the <strong>Course Choice</strong> page...
          </p>
        </div>
      )}
    </div>
  );
}

