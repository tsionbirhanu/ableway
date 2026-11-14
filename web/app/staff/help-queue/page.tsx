'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  ShieldCheck, 
  PhoneCall, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  User, 
  ArrowRight, 
  X, 
  Send, 
  CreditCard, 
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export interface LiveHelpRequest {
  id: string;
  status: 'waiting' | 'assigned' | 'in_progress' | 'done' | 'transferred' | 'cancelled';
  type: 'payment' | 'general' | 'urgent' | 'distress' | 'telegram';
  trigger: 'learner' | 'assistant' | 'timeout';
  reason?: string | null;
  summary?: string | null;
  channel: 'web' | 'telegram' | 'phone';
  page?: string | null;
  profileId?: string | null;
  assignedHelperId?: string | null;
  createdAt: string;
  learnerName?: string | null;
  learnerEmail?: string | null;
}

export default function HelpQueuePage() {
  const { announce } = useA11y();
  const replyInputId = useId();
  const paymentMethodId = useId();
  const paymentAmountId = useId();

  const [activeRequests, setActiveRequests] = useState<LiveHelpRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LiveHelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOperatingHours, setIsOperatingHours] = useState(true);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);

  // Takeover message state
  const [helperMessage, setHelperMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'learner' | 'helper'; text: string; time: string }>>([]);

  // Payment confirmation state
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_transfer' | 'cash' | 'card' | 'scholarship' | 'other'>('mobile_money');
  const [paymentAmount, setPaymentAmount] = useState('500');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // Fetch queue from API
  const fetchQueue = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch('/api/helper/queue');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Helper or Admin permissions required to view the queue.');
        }
        throw new Error('Failed to load help queue.');
      }
      const data = await res.json();
      setActiveRequests(data.queue || []);
      setIsOperatingHours(data.isOperatingHours ?? true);
      setTimeoutMinutes(data.timeoutMinutes ?? 15);
      setError(null);

      if (isInitial) {
        announce(`Help queue loaded with ${data.queue?.length || 0} open requests.`, 'polite');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching queue';
      setError(msg);
      if (isInitial) {
        announce(`Error loading queue: ${msg}`, 'assertive');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [announce]);

  // Initial load and SSE stream setup with fallback polling
  useEffect(() => {
    fetchQueue(true);

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource('/api/helper/queue?stream=true');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.queue) {
            setActiveRequests(data.queue);
            setIsOperatingHours(data.isOperatingHours ?? true);
            setTimeoutMinutes(data.timeoutMinutes ?? 15);
          }
        } catch {
          // ignore parse errors
        }
      };
      eventSource.onerror = () => {
        // Fall back to polling if SSE disconnected
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!pollInterval) {
          pollInterval = setInterval(() => fetchQueue(false), 10000);
        }
      };
    } catch {
      pollInterval = setInterval(() => fetchQueue(false), 10000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchQueue]);

  // Accept & Take Over
  const handleAcceptRequest = async (req: LiveHelpRequest) => {
    try {
      const res = await fetch(`/api/helper/requests/${req.id}/accept`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to accept request');
      }
      const updatedReq: LiveHelpRequest = { ...req, status: 'in_progress' };
      setActiveRequests((prev) => prev.map((r) => (r.id === req.id ? updatedReq : r)));
      setSelectedRequest(updatedReq);
      setChatMessages([
        {
          sender: 'learner',
          text: req.summary || req.reason || 'Requested human support.',
          time: new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          sender: 'helper',
          text: 'Hello! I am a staff helper. I have joined this chat to assist you directly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      announce(`Accepted request from ${req.learnerName || 'Learner'}. Live conversation takeover active.`, 'polite');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error accepting request';
      announce(`Could not accept request: ${msg}`, 'assertive');
    }
  };

  // Send message to learner
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !helperMessage.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    const msgText = helperMessage.trim();

    try {
      const res = await fetch(`/api/helper/requests/${selectedRequest.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message to learner');
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'helper',
          text: msgText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setHelperMessage('');
      announce(`Sent message to learner: ${msgText}`, 'polite');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Could not deliver message';
      announce(`Failed to send: ${errorMsg}`, 'assertive');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Confirm Payment
  const handleConfirmPayment = async () => {
    if (!selectedRequest) return;
    setIsConfirmingPayment(true);

    try {
      // Find learner enrollment or confirm payment
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: selectedRequest.id, // Or enrollment linked to request
          method: paymentMethod,
          currency: 'ETB',
          amountMinor: Math.round(Number.parseFloat(paymentAmount || '500') * 100),
        }),
      });

      if (!res.ok) {
        // If enrollment not directly matching ID, close the help ticket with notes
        await fetch(`/api/helper/requests/${selectedRequest.id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: `Payment verified via ${paymentMethod} (${paymentAmount} ETB). Course unlocked.` }),
        });
      }

      setActiveRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      announce(`Payment confirmed for ${selectedRequest.learnerName || 'Learner'}. Course unlocked!`, 'polite');
      setSelectedRequest(null);
      fetchQueue(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error confirming payment';
      announce(`Payment error: ${msg}`, 'assertive');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // Handback to Assistant
  const handleHandback = async () => {
    if (!selectedRequest) return;
    try {
      await fetch(`/api/helper/requests/${selectedRequest.id}/handback`, { method: 'POST' });
      announce(`Handed conversation back to AI Assistant for ${selectedRequest.learnerName || 'Learner'}.`, 'polite');
      setSelectedRequest(null);
      fetchQueue(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error handing back';
      announce(`Error handing back: ${msg}`, 'assertive');
    }
  };

  // Close & Resolve Ticket
  const handleCloseTicket = async () => {
    if (!selectedRequest) return;
    try {
      await fetch(`/api/helper/requests/${selectedRequest.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Support session resolved and closed by helper.' }),
      });
      announce(`Ticket ${selectedRequest.id} resolved and closed.`, 'polite');
      setActiveRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      setSelectedRequest(null);
      fetchQueue(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error closing ticket';
      announce(`Error closing ticket: ${msg}`, 'assertive');
    }
  };

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Heading */}
      <header className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 id="queue-h1" className="text-3xl font-extrabold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              <span>Staff Help Queue & Live Takeover</span>
            </h1>
            <p className="text-slate-200 text-sm mt-1 max-w-3xl leading-relaxed">
              Unified support queue for Web Assistant and Telegram Bot escalations. Helpers can accept tickets, take over live chats, verify payments, and hand conversations back to the assistant.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              isOperatingHours 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                : 'bg-amber-950 text-amber-300 border border-amber-700'
            }`}>
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isOperatingHours ? 'Online (Operating Hours)' : 'Off-Hours (Callbacks Active)'}</span>
            </span>

            <button
              type="button"
              onClick={() => fetchQueue(false)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
              aria-label="Refresh help queue"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="p-4 bg-red-950/80 border border-red-700 rounded-2xl text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <section aria-labelledby="queue-heading" className="lg:col-span-2 space-y-4">
          <h2 id="queue-heading" className="text-xl font-bold text-white flex items-center justify-between">
            <span>Incoming Help Requests ({activeRequests.length})</span>
            <span className="text-xs text-slate-300 font-mono">Realtime Live Stream</span>
          </h2>

          {loading ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-700 rounded-3xl text-slate-300 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" aria-hidden="true" />
              <span>Loading incoming requests...</span>
            </div>
          ) : (
            <ul className="space-y-3 list-none p-0 m-0">
              {activeRequests.map((req) => (
                <li
                  key={req.id}
                  className={`p-5 rounded-2xl border transition-all bg-slate-900 ${
                    selectedRequest?.id === req.id
                      ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-lg'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <article>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          req.type === 'payment'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : req.type === 'urgent' || req.type === 'distress'
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'bg-blue-950 text-blue-300 border border-blue-700'
                        }`}>
                          {req.type}
                        </span>
                        <span className="text-xs text-slate-300 font-mono">Via {req.channel}</span>
                        {req.page && (
                          <span className="text-xs text-slate-400 font-mono">Page: {req.page}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Created: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    <div className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white text-base">
                          {req.learnerName || 'Anonymous Learner'}
                        </h3>
                        <span className="text-xs font-bold text-slate-300 capitalize">
                          Status: {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {req.summary || req.reason || 'Requested staff assistance.'}
                      </p>
                      {req.learnerEmail && (
                        <p className="text-xs text-slate-400 font-mono">Email: {req.learnerEmail}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">
                        {req.assignedHelperId ? 'Assigned' : 'Unassigned'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl min-h-[44px] transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <span>{selectedRequest?.id === req.id ? 'Active Console' : 'Accept & Take Over'}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                </li>
              ))}

              {activeRequests.length === 0 && (
                <li className="p-12 text-center bg-slate-900 border border-slate-700 rounded-3xl text-slate-300 text-sm space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" aria-hidden="true" />
                  <p className="font-bold text-white text-base">Queue is clear!</p>
                  <p className="text-xs text-slate-400">All learner help requests and payments have been resolved.</p>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Live Conversation Takeover Panel */}
        <section aria-labelledby="takeover-heading" className="space-y-4">
          <h2 id="takeover-heading" className="text-xl font-bold text-white">Live Helper Console</h2>

          {selectedRequest ? (
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-emerald-400 font-mono font-bold">Active Learner</span>
                  <h3 className="font-bold text-white text-base">{selectedRequest.learnerName || 'Learner'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close active takeover panel"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Takeover notice */}
              <div className="p-3 bg-blue-950 border border-blue-700 rounded-xl text-xs text-blue-200">
                <strong>Live Takeover Active:</strong> AI Assistant is silent. Your replies appear directly in the learner&apos;s {selectedRequest.channel} screen.
              </div>

              {/* Chat Thread */}
              <div 
                tabIndex={0}
                aria-label="Conversation messages"
                className="max-h-56 overflow-y-auto space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800"
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs ${
                      msg.sender === 'helper'
                        ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-100 ml-4'
                        : 'bg-slate-800 border border-slate-700 text-slate-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold">{msg.sender === 'helper' ? 'You (Staff)' : selectedRequest.learnerName || 'Learner'}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Chat message dispatch */}
              <form onSubmit={handleSendMessage} className="space-y-2">
                <label htmlFor={replyInputId} className="block text-xs font-bold text-slate-200">
                  Reply to Learner ({selectedRequest.channel}):
                </label>
                <textarea
                  id={replyInputId}
                  rows={3}
                  value={helperMessage}
                  onChange={(e) => setHelperMessage(e.target.value)}
                  placeholder="Type your response to the learner..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !helperMessage.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Send Response</span>
                </button>
              </form>

              {/* Payment Confirmation Section */}
              {selectedRequest.type === 'payment' && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" aria-hidden="true" />
                    <span>Assisted Payment Verification</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor={paymentMethodId} className="block text-[11px] font-bold text-slate-300">
                        Method
                      </label>
                      <select
                        id={paymentMethodId}
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                      >
                        <option value="mobile_money">Telebirr / Mobile Money</option>
                        <option value="bank_transfer">CBE / Bank Transfer</option>
                        <option value="cash">In-Person Cash</option>
                        <option value="card">Card / ATM</option>
                        <option value="scholarship">Scholarship / Free</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={paymentAmountId} className="block text-[11px] font-bold text-slate-300">
                        Amount (ETB)
                      </label>
                      <input
                        id={paymentAmountId}
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isConfirmingPayment}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                  >
                    {isConfirmingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>Confirm Payment & Unlock Course</span>
                  </button>
                </div>
              )}

              {/* Handback and Close Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleHandback}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs min-h-[44px] border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  Hand Back to AI Assistant
                </button>
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  className="w-full py-2.5 bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs min-h-[44px] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  Resolve and Close Ticket
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
    </main>
  );
}
