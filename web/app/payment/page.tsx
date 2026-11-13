'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Send,
  User,
  Globe,
  Mic,
  MicOff,
  Headphones,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { playEarcon } from '@/lib/audio/earcons';

export type PaymentFlowStatus =
  | 'idle'
  | 'waiting'
  | 'assigned'
  | 'in_progress'
  | 'done'
  | 'callback_requested'
  | 'failure';

interface ChatMessage {
  id: string;
  sender: 'staff' | 'learner';
  senderName: string;
  text: string;
  timestamp: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { announce, language, toggleLanguage } = useA11y();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isAmharic = language === 'am-ET';

  const courseId = searchParams.get('courseId') || 'data-analytics';
  const courseTitle = searchParams.get('title') || 'Data Analytics';
  const price = searchParams.get('price') || '500 ETB';

  // Contact Method & Details (F0 Rule 1, 15)
  const [contactMethod, setContactMethod] = useState<'phone' | 'sms' | 'telegram'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Status Machine: idle -> waiting -> assigned -> in_progress -> done (or callback_requested / failure)
  const [status, setStatus] = useState<PaymentFlowStatus>('idle');
  const [ticketId, setTicketId] = useState<string>('TICKET-' + Math.floor(1000 + Math.random() * 9000));
  const [estimatedWait, setEstimatedWait] = useState<string>('2 minutes');

  // Track announcements so each change is announced strictly ONCE
  const lastAnnouncedStatusRef = useRef<string>('');

  // Chat Log (role="log")
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Voice command state for "Call a helper"
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Safe Announcement Helper (Announces each change ONCE)
  const announceOnce = useCallback(
    (key: string, text: string, politeness: 'polite' | 'assertive' = 'polite') => {
      if (lastAnnouncedStatusRef.current !== key) {
        lastAnnouncedStatusRef.current = key;
        announce(text, politeness);
      }
    },
    [announce]
  );

  // Focus h1 on mount (F0 Rule 7)
  useEffect(() => {
    document.title = isAmharic ? 'ክፍያ - Ableway' : 'Payment - Ableway';
    announceOnce(
      'page_loaded',
      isAmharic
        ? `የክፍያ ገጽ ተከፍቷል። የኮርሱ ዋጋ ${price} ነው። የሰው አጋዥ እንዲረዳዎት ጥሪ ማድረግ ይችላሉ።`
        : `Payment page loaded. Amount is ${price}. A helper will contact you to pay safely. Nobody will ever ask for a PIN or password.`
    );
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [announceOnce, isAmharic, price]);

  // Scroll chat into view
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle "Call a helper" action
  const handleCallHelper = useCallback(() => {
    // Validate phone number if phone or sms selected
    if ((contactMethod === 'phone' || contactMethod === 'sms') && !phoneNumber.trim()) {
      const err = isAmharic
        ? 'እባክዎ የስልክ ቁጥርዎን ያስገቡ።'
        : 'Please enter a phone number so the helper can contact you.';
      setPhoneError(err);
      announceOnce('phone_error', err, 'assertive');
      return;
    }

    setPhoneError(null);
    setStatus('waiting');
    playEarcon('success');

    const waitMsg = isAmharic
      ? `የእርዳታ ጥያቄ ቀርቧል። አጋዥ በመጠባበቅ ላይ... የሚገመተው የጥበቃ ጊዜ ${estimatedWait} ነው።`
      : `Help request created. Waiting for an available helper... Estimated wait: ${estimatedWait}.`;
    announceOnce('status_waiting', waitMsg, 'polite');

    // Simulate backend help request
    fetch('/api/help-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment',
        courseId,
        courseTitle,
        price,
        channel: contactMethod,
        phone: phoneNumber,
      }),
    }).catch(() => {
      // Local fallback
    });

    // Advance to "helper assigned"
    setTimeout(() => {
      setStatus('assigned');
      playEarcon('command-recognized');
      const assignedMsg = isAmharic
        ? 'አጋዥ ተመድቧል፦ ሜሮን ከበደ የእርስዎን ጥያቄ ተቀብላለች።'
        : 'Helper assigned: Meron Kebede is ready to help you.';
      announceOnce('status_assigned', assignedMsg, 'polite');
    }, 2500);

    // Advance to "in progress"
    setTimeout(() => {
      setStatus('in_progress');
      playEarcon('command-recognized');
      const inProgMsg = isAmharic
        ? 'ሂደት ላይ፦ አጋዥ ሜሮን በቀጥታ የውይይት መስመር ተገናኝታለች።'
        : 'In progress: Helper Meron is connected in chat.';
      announceOnce('status_in_progress', inProgMsg, 'polite');

      const welcomeStaffMsg: ChatMessage = {
        id: 'msg-init',
        sender: 'staff',
        senderName: isAmharic ? 'ሜሮን ከበደ (የሰው አጋዥ)' : 'Meron Kebede (Helper)',
        text: isAmharic
          ? `ሰላም! እኔ ሜሮን ነኝ። «${courseTitle}»ን ለመክፈል (${price}) በቴሌብር ወይም በባንክ እረዳዎታለሁ። እንዴት መክፈል ይፈልጋሉ?`
          : `Hello! I am Meron. I see you want to enroll in "${courseTitle}" for ${price}. I am here to guide your payment safely. How would you like to pay?`,
        timestamp: 'Just now',
      };
      setMessages([welcomeStaffMsg]);
    }, 5000);
  }, [announceOnce, contactMethod, courseId, courseTitle, estimatedWait, isAmharic, phoneNumber, price]);

  // Handle "Request a call back"
  const handleRequestCallBack = useCallback(() => {
    setStatus('callback_requested');
    playEarcon('success');
    const callbackMsg = isAmharic
      ? 'የተመላሽ ጥሪ ጥያቄ ቀርቧል። አጋዥ በ15 ደቂቃዎች ውስጥ ይደውልልዎታል።'
      : 'Call back requested. A helper will phone you within 15 minutes.';
    announceOnce('status_callback', callbackMsg, 'polite');
  }, [announceOnce, isAmharic]);

  // Trigger simulated failure (for testing / fallback)
  const handleSimulateFailure = useCallback(() => {
    setStatus('failure');
    playEarcon('error');
    const failMsg = isAmharic
      ? 'ከአጋዥ ጋር መገናኘት አልተቻለም። እባክዎ የበይነመረብ ግንኙነትዎን ያረጋግጡ ወይም የተመላሽ ጥሪ ይጠይቁ።'
      : 'Could not connect to helper right now. Please check your internet connection or request a call back.';
    announceOnce('status_failure', failMsg, 'assertive');
  }, [announceOnce, isAmharic]);

  // Confirm payment and navigate to /learn/[courseId]
  const handleConfirmPayment = useCallback(() => {
    setStatus('done');
    playEarcon('success');
    const confirmedMsg = 'Payment confirmed. Opening your course';
    announceOnce('status_done', confirmedMsg, 'polite');

    setTimeout(() => {
      router.push(`/learn/${courseId}`);
    }, 1500);
  }, [announceOnce, courseId, router]);

  // Send message in chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      sender: 'learner',
      senderName: isAmharic ? 'እርስዎ' : 'You',
      text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    playEarcon('command-recognized');

    // Simulate staff response
    setTimeout(() => {
      const staffReply: ChatMessage = {
        id: 'm-' + (Date.now() + 1),
        sender: 'staff',
        senderName: isAmharic ? 'ሜሮን ከበደ (የሰው አጋዥ)' : 'Meron Kebede (Helper)',
        text: isAmharic
          ? `መልእክትዎን ተቀብያለሁ! ክፍያውን በቴሌብር (0911-23-4567) ወይም በCBE (1000-2345-67890) ሲልኩ ወዲያውኑ አረጋግጣለሁ።`
          : `Got your message! You can send ${price} via Telebirr (0911-23-4567) or CBE (1000-2345-67890) and I will verify it right away.`,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, staffReply]);
      playEarcon('command-recognized');
      announceOnce('chat_reply_' + staffReply.id, `${staffReply.senderName}: ${staffReply.text}`, 'polite');
    }, 1000);
  };

  // Voice Command Listener for "Call a helper"
  const startVoiceCommand = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.lang = isAmharic ? 'am-ET' : 'en-US';
      rec.onstart = () => setIsListeningVoice(true);
      rec.onend = () => setIsListeningVoice(false);
      rec.onerror = () => setIsListeningVoice(false);

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript.toLowerCase();
        if (
          text.includes('call') ||
          text.includes('helper') ||
          text.includes('help') ||
          text.includes('ሰው') ||
          text.includes('ጥራልኝ') ||
          text.includes('እገዛ')
        ) {
          handleCallHelper();
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {}
  }, [handleCallHelper, isAmharic]);

  // Global helper for simulated voice in Playwright
  useEffect(() => {
    (window as any).__simulatePaymentVoice = (cmd: string) => {
      const lower = cmd.toLowerCase();
      if (lower.includes('call') || lower.includes('helper') || lower.includes('ሰው')) {
        handleCallHelper();
      }
    };
  }, [handleCallHelper]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 bg-white text-slate-900 min-h-screen">
      {/* Top Navigation & Language Switch */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B132B] hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
        >
          <ArrowLeft className="w-4 h-4 text-orange-600" aria-hidden="true" />
          <span>{isAmharic ? 'ወደ ኮርሶች ተመለስ' : 'Back to Courses'}</span>
        </Link>

        <button
          type="button"
          onClick={toggleLanguage}
          id="payment-lang-toggle"
          className="min-h-[44px] px-3.5 py-2 rounded-lg font-bold text-xs border border-orange-500/80 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
          <span>{isAmharic ? 'ቋንቋ፡ አማርኛ' : 'Language: English'}</span>
        </button>
      </div>

      {/* Header Landmark (F0 Rule 2, 7) */}
      <header className="space-y-4">
        {/* Exact h1 "Payment" (User Requirement) */}
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
        >
          {isAmharic ? 'ክፍያ' : 'Payment'}
        </h1>

        {/* Plain Language Explanations: Amount, Helper will contact, Nobody asks for PIN or password (User Requirement) */}
        <div className="p-5 bg-slate-50 border-2 border-slate-300 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                {isAmharic ? 'የተመረጠ ኮርስ' : 'Selected Course'}
              </span>
              <p className="text-xl font-black text-slate-900">{courseTitle}</p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block sm:text-right">
                {isAmharic ? 'የሚከፈል መጠን' : 'Amount'}
              </span>
              <p className="text-2xl font-black text-[#0B132B] sm:text-right">{price}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-medium">
            <p className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {isAmharic
                  ? 'አንድ የተረጋገጠ የሰው አጋዥ ክፍያዎን በደህና እንዲፈጽሙ በቀጥታ ያነጋግርዎታል።'
                  : 'A human helper will contact you directly to help you pay safely.'}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {isAmharic
                  ? 'ማንም ሰው በዚህ ድረ-ገጽ ላይ የእርስዎን ፒን (PIN)፣ የይለፍ ቃል ወይም የሞባይል ባንክ ሚስጥር ቁጥር አይጠይቅም።'
                  : 'Nobody will ever ask for a PIN, password, or mobile wallet secret code on this site.'}
              </span>
            </p>
            <p className="text-xs text-slate-700 font-semibold pl-7">
              {isAmharic
                ? 'ምንም ዓይነት የክሬዲት ካርድ ወይም የዲጂታል ቦርሳ መረጃ ማስገባት አያስፈልግዎትም።'
                : 'We never ask for or store credit cards, PINs, or wallet credentials.'}
            </p>
          </div>
        </div>
      </header>

      {/* Failure State in Plain Language (User Requirement) */}
      {status === 'failure' && (
        <section
          role="alert"
          aria-live="assertive"
          className="p-5 bg-red-50 border-2 border-red-300 rounded-2xl space-y-3"
        >
          <div className="flex items-center gap-2 text-red-900 font-bold">
            <AlertCircle className="w-5 h-5 text-red-700" aria-hidden="true" />
            <h2 className="text-lg font-bold">
              {isAmharic ? 'ከአጋዥ ጋር መገናኘት አልተቻለም' : 'Could not connect to helper'}
            </h2>
          </div>
          <p className="text-sm text-red-900 font-medium">
            {isAmharic
              ? 'የእርዳታ ጥያቄዎን አሁን ማስኬድ አልተቻለም። እባክዎ የበይነመረብ ግንኙነትዎን ያረጋግጡ ወይም የተመላሽ ጥሪ ይጠይቁ።'
              : 'We could not connect you to a helper right now. Please check your internet connection or request a call back.'}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              id="retry-helper-btn"
              onClick={handleCallHelper}
              className="min-h-[44px] px-5 py-2.5 bg-red-800 text-white font-bold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              {isAmharic ? 'እንደገና ሞክር' : 'Try again'}
            </button>
            <button
              type="button"
              id="failure-callback-btn"
              onClick={handleRequestCallBack}
              className="min-h-[44px] px-5 py-2.5 bg-white text-red-900 border-2 border-red-800 font-bold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              {isAmharic ? 'የተመላሽ ጥሪ ጠይቅ' : 'Request a call back'}
            </button>
          </div>
        </section>
      )}

      {/* Step 1: Help Request Form (Contact Method RadioGroup & Phone Input) */}
      {status === 'idle' && (
        <section
          aria-labelledby="request-helper-heading"
          className="p-6 sm:p-8 bg-white border-2 border-[#0B132B] rounded-2xl shadow-sm space-y-6"
        >
          <h2 id="request-helper-heading" className="text-xl font-bold text-slate-900">
            {isAmharic ? 'የሰው አጋዥ ድጋፍ ይጠይቁ' : 'Request Human Payment Assistance'}
          </h2>

          {/* RadioGroup for Contact Preference (User Requirement) */}
          <fieldset className="space-y-3">
            <legend id="contact-method-legend" className="text-sm font-bold text-slate-900 block mb-1">
              {isAmharic ? 'አጋዡ እንዴት እንዲያገኝዎት ይፈልጋሉ?' : 'How would you like the helper to contact you?'}
            </legend>
            <div
              role="radiogroup"
              aria-labelledby="contact-method-legend"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <label
                htmlFor="contact-phone"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  contactMethod === 'phone'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-400/30'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  id="contact-phone"
                  name="contact-method"
                  value="phone"
                  checked={contactMethod === 'phone'}
                  onChange={() => setContactMethod('phone')}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-slate-900">
                  {isAmharic ? 'የስልክ ጥሪ' : 'Phone call'}
                </span>
              </label>

              <label
                htmlFor="contact-sms"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  contactMethod === 'sms'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-400/30'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  id="contact-sms"
                  name="contact-method"
                  value="sms"
                  checked={contactMethod === 'sms'}
                  onChange={() => setContactMethod('sms')}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-slate-900">
                  {isAmharic ? 'የአጭር የጽሁፍ መልእክት (SMS)' : 'SMS'}
                </span>
              </label>

              <label
                htmlFor="contact-telegram"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  contactMethod === 'telegram'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-400/30'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  id="contact-telegram"
                  name="contact-method"
                  value="telegram"
                  checked={contactMethod === 'telegram'}
                  onChange={() => setContactMethod('telegram')}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-slate-900">
                  {isAmharic ? 'ቴሌግራም' : 'Telegram'}
                </span>
              </label>
            </div>
          </fieldset>

          {/* Ask for phone number if needed (phone or sms) */}
          {(contactMethod === 'phone' || contactMethod === 'sms') && (
            <div className="space-y-1.5">
              <label htmlFor="learner-phone-number" className="block text-sm font-bold text-slate-900">
                {isAmharic ? 'የስልክ ቁጥርዎ' : 'Phone number'}{' '}
                <span className="text-xs font-semibold text-slate-700">
                  ({isAmharic ? 'አስፈላጊ' : 'required for ' + contactMethod})
                </span>
              </label>
              <input
                id="learner-phone-number"
                type="tel"
                autoComplete="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 91 123 4567"
                className="w-full min-h-[44px] bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400 font-medium"
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? 'phone-error-desc' : undefined}
              />
              {phoneError && (
                <p id="phone-error-desc" role="alert" className="text-xs font-bold text-red-800">
                  {phoneError}
                </p>
              )}
            </div>
          )}

          {/* Large "Call a helper" button (User Requirement) */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              id="call-a-helper-btn"
              onClick={handleCallHelper}
              className="w-full min-h-[56px] py-4 px-8 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 text-lg font-bold rounded-2xl flex items-center justify-center gap-3 border-2 border-orange-500 shadow-lg focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer transition-transform active:scale-98"
            >
              <PhoneCall className="w-6 h-6 text-orange-400" aria-hidden="true" />
              <span>{isAmharic ? 'የሰው አጋዥ ጥራ' : 'Call a helper'}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold pt-1">
              <span>
                {isAmharic
                  ? 'ወይም «ሰው ጥራልኝ» በማለት በድምጽ ማዘዝ ይችላሉ'
                  : 'Or say "Call a helper" using voice command'}
              </span>
              <button
                type="button"
                onClick={startVoiceCommand}
                id="voice-command-helper-btn"
                className="inline-flex items-center gap-1 text-orange-800 hover:text-orange-950 underline"
                aria-label={isListeningVoice ? 'Listening for voice command' : 'Speak command: Call a helper'}
              >
                <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isListeningVoice ? 'እያዳመጠ ነው...' : 'Speak command'}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Live Status Component with Steps: waiting, helper assigned, in progress, done (User Requirement) */}
      {status !== 'idle' && status !== 'failure' && (
        <section
          aria-labelledby="live-status-heading"
          aria-live="polite"
          className="p-6 sm:p-8 bg-slate-50 border-2 border-[#0B132B] rounded-2xl space-y-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-slate-600 block">
                {isAmharic ? 'የጥያቄ ቁጥር' : 'Assistance Ticket'}: {ticketId}
              </span>
              <h2 id="live-status-heading" className="text-2xl font-black text-slate-900 mt-0.5">
                {status === 'waiting' && (isAmharic ? 'ሁኔታ፦ በመጠባበቅ ላይ' : 'Status: Waiting')}
                {status === 'assigned' && (isAmharic ? 'ሁኔታ፦ አጋዥ ተመድቧል' : 'Status: Helper Assigned')}
                {status === 'in_progress' && (isAmharic ? 'ሁኔታ፦ ሂደት ላይ' : 'Status: In Progress')}
                {status === 'done' && (isAmharic ? 'ሁኔታ፦ ተጠናቋል' : 'Status: Done')}
                {status === 'callback_requested' && (isAmharic ? 'ሁኔታ፦ የተመላሽ ጥሪ ተመዝግቧል' : 'Status: Call Back Requested')}
              </h2>
            </div>

            {/* Status Pills */}
            <div>
              {status === 'waiting' && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 inline-block animate-pulse">
                  {isAmharic ? 'አጋዥ በመፈለግ ላይ' : 'Waiting for helper'}
                </span>
              )}
              {status === 'assigned' && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300 inline-block">
                  {isAmharic ? 'አጋዥ ተመድቧል' : 'Helper assigned'}
                </span>
              )}
              {status === 'in_progress' && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-block">
                  {isAmharic ? 'ቀጥታ ውይይት' : 'In progress'}
                </span>
              )}
              {status === 'done' && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-700 text-white border border-emerald-800 inline-block">
                  {isAmharic ? 'ክፍያ ተረጋግጧል' : 'Done'}
                </span>
              )}
              {status === 'callback_requested' && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-300 inline-block">
                  {isAmharic ? 'የተመላሽ ጥሪ' : 'Call back scheduled'}
                </span>
              )}
            </div>
          </div>

          {/* Status Step Descriptions & Estimated Wait */}
          <div className="space-y-4 text-sm text-slate-800">
            {status === 'waiting' && (
              <div className="space-y-4">
                <p className="font-medium text-slate-900">
                  {isAmharic
                    ? `የእርዳታ ጥያቄዎ ወረፋ ውስጥ ገብቷል። የሚገመተው የጥበቃ ጊዜ፦ ${estimatedWait}።`
                    : `Waiting for an available helper... Estimated wait: ${estimatedWait}.`}
                </p>

                {/* "Request a call back" option when no helper is available (User Requirement) */}
                <div className="p-4 bg-white rounded-xl border border-slate-300 space-y-2">
                  <p className="text-xs font-bold text-slate-800">
                    {isAmharic
                      ? 'አሁን መጠበቅ ካልፈለጉ የተመላሽ ጥሪ መጠየቅ ይችላሉ፦'
                      : 'No helper available right away or prefer not to wait?'}
                  </p>
                  <button
                    type="button"
                    id="request-callback-btn"
                    onClick={handleRequestCallBack}
                    className="min-h-[44px] px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                  >
                    {isAmharic ? 'የተመላሽ ጥሪ ጠይቅ' : 'Request a call back'}
                  </button>
                </div>
              </div>
            )}

            {status === 'assigned' && (
              <p className="font-semibold text-slate-900">
                {isAmharic
                  ? 'የሰው አጋዥ ሜሮን ከበደ ጥያቄዎን ተቀብላለች። ወደ ውይይት በማገናኘት ላይ...'
                  : 'Helper assigned: Meron Kebede is ready to help you.'}
              </p>
            )}

            {status === 'callback_requested' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <p className="font-bold text-purple-950">
                  {isAmharic
                    ? 'የተመላሽ ጥሪዎ ተመዝግቧል!'
                    : 'Your call back request has been confirmed!'}
                </p>
                <p className="text-xs text-purple-900">
                  {isAmharic
                    ? 'አንድ የሰው አጋዥ በ15 ደቂቃዎች ውስጥ በስልክዎ ይደውልልዎታል።'
                    : 'A human helper will phone you within 15 minutes to guide your payment safely.'}
                </p>
              </div>
            )}

            {status === 'done' && (
              <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" aria-hidden="true" />
                <h3 className="text-lg font-bold text-emerald-950">
                  {isAmharic ? 'ክፍያ ተረጋግጧል!' : 'Payment Confirmed!'}
                </h3>
                <p className="text-sm font-medium text-emerald-900">
                  Payment confirmed. Opening your course
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Chat Area Between Learner and Helper (role="log") (User Requirement) */}
      {(status === 'in_progress' || status === 'assigned' || status === 'done') && (
        <section
          aria-labelledby="chat-heading"
          className="bg-white border-2 border-[#0B132B] rounded-2xl shadow-md overflow-hidden flex flex-col"
        >
          {/* Helper Banner & "Assistant Stays Silent" notice (User Requirement) */}
          <div className="bg-[#0B132B] text-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center text-orange-400">
                <Headphones className="w-6 h-6 text-orange-400" aria-hidden="true" />
              </div>
              <div>
                <h2 id="chat-heading" className="text-lg font-bold text-white">
                  {isAmharic ? 'ሜሮን ከበደ (የሰው አጋዥ)' : 'Meron Kebede (Human Helper)'}
                </h2>
                <p className="text-xs text-slate-300">
                  {isAmharic
                    ? 'የተረጋገጠች የኤብልዌይ የክፍያ እና የትምህርት አስተባባሪ'
                    : 'Verified Ableway Payment & Learning Coordinator'}
                </p>
              </div>
            </div>

            {/* Interface states that automated assistant stays silent (User Requirement) */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-orange-300">
              <MicOff className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <span>
                {isAmharic
                  ? 'የሰው አጋዥ በሚያነጋግርዎ ወቅት የድምጽ ረዳቱ ዝም ይላል'
                  : 'Assistant stays silent while helper is in charge'}
              </span>
            </div>
          </div>

          {/* Chat Messages Container with role="log" (User Requirement) */}
          <div
            role="log"
            id="helper-chat-log"
            aria-label="Chat messages between you and helper"
            aria-live="polite"
            className="p-5 sm:p-6 bg-slate-50 min-h-[260px] max-h-[380px] overflow-y-auto space-y-4"
          >
            {messages.map((msg) => {
              const isStaff = msg.sender === 'staff';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-700 font-bold">
                    <span>{msg.senderName}</span>
                    <span className="text-[11px] text-slate-600">({msg.timestamp})</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm font-semibold ${
                      isStaff
                        ? 'bg-white text-slate-950 border-2 border-slate-300 rounded-tl-sm'
                        : 'bg-[#0B132B] text-white border-2 border-orange-500 rounded-tr-sm'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Text Input & Send Button (User Requirement) */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t-2 border-slate-200 flex items-center gap-3"
            aria-label="Chat with helper message form"
          >
            <label htmlFor="chat-message-input" className="sr-only">
              {isAmharic ? 'ለሰው አጋዥ መልእክት ይጻፉ' : 'Type message to helper'}
            </label>
            <input
              id="chat-message-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                isAmharic
                  ? 'ጥያቄዎን ወይም የቴሌብር ቁጥርዎን ይጻፉ ...'
                  : 'Type your message (e.g. "How do I pay with Telebirr?")...'
              }
              className="flex-1 min-h-[44px] bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400 font-medium"
            />

            <button
              type="submit"
              id="chat-send-btn"
              className="min-h-[44px] px-6 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 border-2 border-orange-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer transition-colors"
            >
              <span>{isAmharic ? 'ላክ' : 'Send'}</span>
              <Send className="w-4 h-4 text-orange-400" aria-hidden="true" />
            </button>
          </form>

          {/* Staff Confirmation Action (Verifies payment and redirects) */}
          <div className="p-4 bg-orange-50 border-t-2 border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-bold text-orange-950">
              {isAmharic ? 'የረዳት ማረጋገጫ፦' : 'Staff verification action:'}
            </span>
            <button
              type="button"
              id="confirm-payment-btn"
              onClick={handleConfirmPayment}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <span>
                {isAmharic
                  ? '[የረዳት እርምጃ] ክፍያን አረጋግጥ እና ኮርሱን ክፈት'
                  : '[Staff Action] Confirm Payment & Open Course'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Hidden button for testing simulated failure */}
      <div className="sr-only">
        <button type="button" id="simulate-failure-trigger-btn" onClick={handleSimulateFailure}>
          Simulate Connection Failure
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-700 font-bold">
          Loading payment details...
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
