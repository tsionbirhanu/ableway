'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PhoneCall, ShieldCheck, CheckCircle2, Clock, AlertCircle, ArrowRight, MessageSquare } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { HelpRequestStatus } from '@/types';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { announce } = useA11y();

  const courseTitle = searchParams.get('title') || 'Digital Accessibility Fundamentals';
  const price = searchParams.get('price') || '500';
  const currency = 'ETB';

  const [requestStatus, setRequestStatus] = useState<HelpRequestStatus | null>(null);
  const [channelPreference, setChannelPreference] = useState<'phone' | 'telegram' | 'web'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleRequestHelper = async () => {
    setRequestStatus('waiting');
    const tid = 'TICKET-' + Math.floor(1000 + Math.random() * 9000);
    setTicketId(tid);

    const announcement = `Human payment assistance requested. Ticket ${tid} created. A staff helper will contact you via ${channelPreference} shortly.`;
    announce(announcement);

    try {
      await fetch('/api/help-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          summary: `Payment assistance requested for course "${courseTitle}" (${price} ${currency})`,
          channel: channelPreference,
        }),
      });
    } catch (e) {
      console.warn('Help request sent locally:', e);
    }

    // Simulate staff response states for co-designer demonstration (FR-4.5)
    setTimeout(() => {
      setRequestStatus('assigned');
      announce('A human helper has accepted your ticket and is preparing to assist you.');
    }, 4000);

    setTimeout(() => {
      setRequestStatus('in_progress');
      announce('Human helper Meron is in contact with you.');
    }, 8000);
  };

  const handleSimulateConfirmation = () => {
    // Helper confirms payment in console (FR-4.7)
    setRequestStatus('done');
    announce('Payment verified and confirmed by staff helper Meron. Your course is unlocked! Redirecting to learning platform.');
    setTimeout(() => {
      router.push('/learn');
    }, 2500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
          <span>FR-4.1 to FR-4.10: Safe Human-Assisted Payment</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Course Payment & Human Help</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          At Ableway, all payments are guided directly by verified human staff members to protect your financial security. We never ask for or store credit cards, PINs, or mobile-money passwords.
        </p>
      </header>

      {/* Course Summary Box */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <h2 className="text-lg font-bold text-white">Course Summary</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-slate-950 rounded-2xl border border-slate-800">
          <div>
            <span className="text-xs text-emerald-400 font-mono uppercase">Selected Course</span>
            <p className="font-bold text-white text-base mt-0.5">{courseTitle}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Due</span>
            <p className="text-2xl font-black text-white">{price} {currency}</p>
          </div>
        </div>
      </div>

      {/* Human Helper Request Action */}
      {!requestStatus && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-emerald-400" />
              <span>Request a Human Helper</span>
            </h2>
            <p className="text-xs text-slate-300">
              Click the button below or say <strong className="text-emerald-300">"Call human"</strong> to place a request in the staff queue.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-200">
              How would you like the helper to contact you?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'phone', label: 'Direct Phone Call' },
                { id: 'telegram', label: 'Telegram Message' },
                { id: 'web', label: 'In-Page Web Chat' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChannelPreference(opt.id as any)}
                  className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                    channelPreference === opt.id
                      ? 'bg-emerald-700 border-emerald-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {channelPreference === 'phone' && (
              <div className="pt-2">
                <label htmlFor="contact-phone" className="block text-xs font-medium text-slate-300 mb-1">
                  Your Phone Number:
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+251 91 123 4567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRequestHelper}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg transition-transform active:scale-98 focus:outline-none focus:ring-4 focus:ring-emerald-400"
            aria-label="Request human helper for payment assistance"
          >
            <PhoneCall className="w-5 h-5" />
            <span>Request Human Payment Helper</span>
          </button>
        </div>
      )}

      {/* Live Ticket Status Tracker (FR-4.5) */}
      {requestStatus && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl" aria-live="polite">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-slate-400 font-mono">Assistance Ticket: {ticketId}</span>
              <h2 className="text-xl font-bold text-white mt-1">Status: {requestStatus.toUpperCase()}</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              requestStatus === 'waiting'
                ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                : requestStatus === 'assigned' || requestStatus === 'in_progress'
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {requestStatus}
            </span>
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            {requestStatus === 'waiting' && (
              <p>Your request is currently in the queue. A human helper will review your course selection and contact you shortly.</p>
            )}
            {requestStatus === 'assigned' && (
              <p>Staff helper <strong>Meron K.</strong> has accepted your ticket and is preparing payment instructions (Telebirr / CBE).</p>
            )}
            {requestStatus === 'in_progress' && (
              <div className="space-y-4">
                <p>Helper Meron is assisting you now. Once payment is verified in the staff console, your course will automatically unlock.</p>
                {/* Demo Helper Action */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs text-emerald-400 font-mono font-bold">Helper Console Simulation:</span>
                  <p className="text-xs text-slate-400">Simulate staff helper verifying Telebirr confirmation code and approving enrollment:</p>
                  <button
                    onClick={handleSimulateConfirmation}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>[Staff Action] Mark Payment Confirmed & Unlock Course</span>
                  </button>
                </div>
              </div>
            )}
            {requestStatus === 'done' && (
              <div className="p-4 bg-emerald-950 border border-emerald-800 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-white">Course Unlocked!</h3>
                <p className="text-xs text-slate-300">Redirecting you to your learning platform modules...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading payment details...</div>}>
      <PaymentContent />
    </Suspense>
  );
}

