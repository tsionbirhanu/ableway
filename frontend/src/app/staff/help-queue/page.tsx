'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, ArrowRight, X } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';
import { HelpRequest } from '@/types';

export default function HelpQueuePage() {
  const { announce } = useA11y();

  const [activeRequests, setActiveRequests] = useState<HelpRequest[]>([
    {
      id: 'req-1',
      learner_id: 'learner-101',
      learner_name: 'Dawit Mengistu',
      learner_phone: '+251 91 234 5678',
      type: 'payment',
      trigger: 'learner',
      summary: 'Assistance requested for paying course "Digital Accessibility Fundamentals" (500 ETB) via Telebirr.',
      status: 'waiting',
      channel: 'phone',
      contact_preference: 'Direct Phone Call',
      course_title: 'Digital Accessibility Fundamentals',
      created_at: '2 mins ago',
      updated_at: '2 mins ago',
    },
    {
      id: 'req-2',
      learner_id: 'learner-102',
      learner_name: 'Hiwot Tadesse',
      type: 'telegram',
      trigger: 'learner',
      summary: 'Asked Telegram Bot about remote jobs matching audio transcription.',
      status: 'assigned',
      assigned_helper_name: 'Meron K.',
      channel: 'telegram',
      contact_preference: 'Telegram Chat',
      created_at: '6 mins ago',
      updated_at: '3 mins ago',
    },
    {
      id: 'req-3',
      learner_id: 'learner-103',
      learner_name: 'Kalkidan Girma',
      type: 'urgent',
      trigger: 'assistant',
      summary: 'Assistant escalated after speech recognition failed 3 times on the registration page.',
      status: 'waiting',
      channel: 'web',
      contact_preference: 'In-Page Web Chat',
      created_at: '1 min ago',
      updated_at: '1 min ago',
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [helperMessage, setHelperMessage] = useState('');

  const handleAcceptRequest = (req: HelpRequest) => {
    setActiveRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'in_progress', assigned_helper_name: 'You (Staff)' } : r))
    );
    setSelectedRequest({ ...req, status: 'in_progress', assigned_helper_name: 'You (Staff)' });
    announce(`Accepted ticket for ${req.learner_name}. Live conversation takeover started.`, 'polite');
  };

  const handleConfirmPayment = (req: HelpRequest) => {
    setActiveRequests((prev) => prev.filter((r) => r.id !== req.id));
    setSelectedRequest(null);
    announce(`Payment for ${req.learner_name} confirmed. Course unlocked on learner's account.`, 'polite');
  };

  const handleCloseTicket = (req: HelpRequest) => {
    setActiveRequests((prev) => prev.filter((r) => r.id !== req.id));
    setSelectedRequest(null);
    announce(`Ticket ${req.id} resolved and closed.`, 'polite');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Heading (Rule 2) */}
      <header className="space-y-2">
        <h1 id="queue-h1" className="text-3xl font-extrabold text-white">
          Staff Help Queue & Live Takeover
        </h1>
        <p className="text-slate-200 text-sm leading-relaxed">
          Unified support queue for Web Assistant and Telegram Bot escalations. Helpers can accept tickets, contact learners, take over live conversations, and verify course payments.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List (Rule 1 & 24: native ul/li) */}
        <section aria-labelledby="queue-heading" className="lg:col-span-2 space-y-4">
          <h2 id="queue-heading" className="text-xl font-bold text-white flex items-center justify-between">
            <span>Incoming Help Requests ({activeRequests.length})</span>
            <span className="text-xs text-slate-300 font-mono">Realtime Queue</span>
          </h2>

          <ul className="space-y-3 list-none p-0 m-0">
            {activeRequests.map((req) => (
              <li
                key={req.id}
                className={`p-5 rounded-2xl border transition-all bg-slate-900 ${
                  selectedRequest?.id === req.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <article>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        req.type === 'payment'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : req.type === 'urgent'
                          ? 'bg-red-950 text-red-300 border border-red-700'
                          : 'bg-blue-950 text-blue-300 border border-blue-700'
                      }`}>
                        {req.type}
                      </span>
                      <span className="text-xs text-slate-300 font-mono">Via {req.channel}</span>
                    </div>
                    <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Wait: {req.created_at}</span>
                    </span>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base">{req.learner_name}</h3>
                      <span className="text-xs font-bold text-slate-300 capitalize">
                        Status: {req.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{req.summary}</p>
                    {req.learner_phone && (
                      <p className="text-xs text-emerald-400 font-mono font-bold">Contact: {req.learner_phone}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">
                      {req.assigned_helper_name ? `Assigned to: ${req.assigned_helper_name}` : 'Unassigned'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(req)}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl min-h-[44px] transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <span>Accept & Take Over</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              </li>
            ))}

            {activeRequests.length === 0 && (
              <li className="p-8 text-center bg-slate-900 border border-slate-700 rounded-2xl text-slate-300 text-sm">
                Queue is clear! No pending help requests.
              </li>
            )}
          </ul>
        </section>

        {/* Live Conversation Takeover Panel */}
        <section aria-labelledby="takeover-heading" className="space-y-4">
          <h2 id="takeover-heading" className="text-xl font-bold text-white">Live Helper Console</h2>

          {selectedRequest ? (
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-emerald-400 font-mono font-bold">Active Learner</span>
                  <h3 className="font-bold text-white text-base">{selectedRequest.learner_name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-slate-300 hover:text-white rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close active takeover panel"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Takeover notice */}
              <div className="p-3 bg-blue-950 border border-blue-700 rounded-xl text-xs text-blue-200">
                <strong>Live Takeover Active:</strong> AI Assistant is silent. Your replies appear directly in the learner&apos;s web or Telegram screen.
              </div>

              {/* Chat message dispatch (Rule 15: visible label) */}
              <div className="space-y-2">
                <label htmlFor="helper-response-input" className="block text-xs font-bold text-slate-200">
                  Reply to Learner:
                </label>
                <textarea
                  id="helper-response-input"
                  rows={3}
                  value={helperMessage}
                  onChange={(e) => setHelperMessage(e.target.value)}
                  placeholder="Type your response to the learner..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    announce(`Sent message to ${selectedRequest.learner_name}: ${helperMessage}`, 'polite');
                    setHelperMessage('');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs min-h-[44px] flex items-center justify-center"
                >
                  Send Response
                </button>
              </div>

              {/* Payment Confirmation Button */}
              {selectedRequest.type === 'payment' && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-emerald-400">Payment Action:</span>
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(selectedRequest)}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Confirm Payment & Unlock Course</span>
                  </button>
                </div>
              )}

              {/* Close Ticket */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleCloseTicket(selectedRequest)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs min-h-[44px] border border-slate-600"
                >
                  Resolve and Hand Back to Assistant
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl text-center text-slate-300 text-xs">
              Select an incoming ticket from the queue to start helper takeover.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
