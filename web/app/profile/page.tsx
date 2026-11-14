'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  Sliders,
  Languages,
  Bell,
  Send,
  Shield,
  Copy,
  Volume2,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Pause,
  Play,
  Download,
  AlertTriangle,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { playEarcon } from '@/lib/audio/earcons';
import { Button, Dialog } from '@/components/ui';

interface AlertSubscription {
  id: string;
  keywords: string;
  location: string;
  jobType: string;
  channel: string;
  active: boolean;
}

const INITIAL_SUBSCRIPTIONS: AlertSubscription[] = [
  {
    id: 'sub-1',
    keywords: 'Accessibility tester, screen reader evaluation',
    location: 'Remote',
    jobType: 'Full-time',
    channel: 'Telegram',
    active: true,
  },
  {
    id: 'sub-2',
    keywords: 'Customer support, bilingual Amharic English',
    location: 'Addis Ababa',
    jobType: 'Part-time',
    channel: 'SMS',
    active: true,
  },
];

export default function ProfilePage() {
  const {
    announce,
    speak,
    mode,
    setMode,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    language,
    setLanguage,
    toggleLanguage,
  } = useA11y();

  const h1Ref = useRef<HTMLHeadingElement | null>(null);

  // 1. Personal details state
  const [fullName, setFullName] = useState('Abebe Bikila');
  const [email, setEmail] = useState('abebe@example.com');
  const [phone, setPhone] = useState('+251911234567');
  const [personalDetailsSaved, setPersonalDetailsSaved] = useState(false);

  // 2. Accessibility settings state
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

  // 4. Alerts state
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>(INITIAL_SUBSCRIPTIONS);
  const [alertKeywords, setAlertKeywords] = useState('');
  const [alertLocation, setAlertLocation] = useState('Remote');
  const [alertJobType, setAlertJobType] = useState('Full-time');
  const [alertChannel, setAlertChannel] = useState('Telegram');
  const [alertFormError, setAlertFormError] = useState<string | null>(null);

  // 5. Telegram section state
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expirySeconds, setExpirySeconds] = useState<number>(300);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState<boolean>(false);

  // 6. Privacy & Data dialogs
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Trigger refs for returning focus after dialog close (F0 Rule 8)
  const unlinkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const exportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const alertKeywordsInputRef = useRef<HTMLInputElement | null>(null);

  const isAmharic = language === 'am-ET' || language === 'am';

  // Move focus to h1 on mount (F0 Rule 7)
  useEffect(() => {
    document.title = isAmharic
      ? 'የተጠቃሚ መገለጫ እና ምርጫዎች - Ableway'
      : 'Learner profile and settings - Ableway';
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [isAmharic]);

  // Countdown timer for link code
  useEffect(() => {
    if (!linkCode || isLinked || isExpired) return;

    const timer = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          announce('Code has expired. Please make a new code.', 'assertive');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [linkCode, isLinked, isExpired, announce]);

  // Polling to detect Telegram link confirmation
  useEffect(() => {
    if (!linkCode || isLinked || isExpired) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/telegram/link?code=${linkCode}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.linked) {
          setIsLinked(true);
          setLinkCode(null);
          playEarcon('success');
          announce('Telegram connected', 'polite');
        }
      } catch {
        // Polling gracefully ignores network hiccups
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [linkCode, isLinked, isExpired, announce]);

  // Handle Save Personal Details
  const handleSavePersonalDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalDetailsSaved(true);
    playEarcon('success');
    announce('Personal details saved successfully.', 'polite');
  };

  // Handle Add Job Alert
  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertKeywords.trim()) {
      setAlertFormError('Please enter one or more keywords for this alert.');
      alertKeywordsInputRef.current?.focus();
      announce('Error: Please enter one or more keywords for this alert.', 'assertive');
      return;
    }

    setAlertFormError(null);
    const newSub: AlertSubscription = {
      id: `sub-${Date.now()}`,
      keywords: alertKeywords.trim(),
      location: alertLocation.trim() || 'Any location',
      jobType: alertJobType,
      channel: alertChannel,
      active: true,
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    const addedMsg = `New job alert added for ${newSub.keywords} delivered via ${newSub.channel}.`;
    setAlertKeywords('');
    playEarcon('success');
    announce(addedMsg, 'polite');
  };

  const handleTogglePause = (sub: AlertSubscription) => {
    const updatedStatus = !sub.active;
    setSubscriptions((prev) =>
      prev.map((item) => (item.id === sub.id ? { ...item, active: updatedStatus } : item))
    );
    const msg = updatedStatus
      ? `Alert for ${sub.keywords} resumed.`
      : `Alert for ${sub.keywords} paused.`;
    announce(msg, 'polite');
  };

  const handleDeleteSubscription = (sub: AlertSubscription) => {
    setSubscriptions((prev) => prev.filter((item) => item.id !== sub.id));
    announce(`Alert for ${sub.keywords} deleted.`, 'polite');
  };

  // Handle Telegram Connect & Code Generation
  const handleConnectTelegram = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setLinkCode(code);
    setExpirySeconds(300);
    setIsExpired(false);
    setIsCopied(false);
    playEarcon('listening');
    const slowDigits = code.split('').join(' ');
    announce(
      `Your Telegram linking code is ${slowDigits}. It expires in 5 minutes. Follow the four steps on screen.`,
      'polite'
    );

    // Sync with backend link-code endpoint in background
    void fetch("/api/telegram/link-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
  }, [announce]);

  // Handle Copy Code
  const handleCopyCode = async () => {
    if (!linkCode) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(linkCode);
      }
      setIsCopied(true);
      announce('Code copied to clipboard.', 'polite');
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      announce('Code copied.', 'polite');
    }
  };

  // Handle Read Code Slowly Character by Character
  const handleReadCodeSlowly = () => {
    if (!linkCode) return;
    const slowSpokenText = linkCode.split('').join(' ... ');
    if (mode === 'voice-first') {
      speak(slowSpokenText, true);
    } else {
      announce(`Code digits: ${slowSpokenText}`, 'assertive');
    }
  };

  // Simulated link event (for tests and demonstration)
  const handleSimulateLinkConnected = () => {
    setIsLinked(true);
    setLinkCode(null);
    playEarcon('success');
    announce('Telegram connected', 'polite');
  };

  // Handle Confirm Unlink Telegram
  const handleConfirmUnlink = () => {
    setIsLinked(false);
    setIsUnlinkDialogOpen(false);
    playEarcon('stop');
    announce('Telegram disconnected', 'polite');
    unlinkTriggerRef.current?.focus();

    void fetch("/api/telegram/link-code", { method: "DELETE" }).catch(() => null);
  };

  // Handle Export Data Confirmation
  const handleConfirmExport = () => {
    setIsExportDialogOpen(false);
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      profile: { fullName, email, phone, language },
      accessibility: { mode, theme, fontSize, shortcutsEnabled },
      subscriptions,
      telegramLinked: isLinked,
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ableway-learner-data.json';
    a.click();
    URL.revokeObjectURL(url);
    announce('Your data export has downloaded.', 'polite');
    exportTriggerRef.current?.focus();

    void fetch("/api/profile/export").catch(() => null);
  };

  // Handle Delete Account Confirmation
  const handleConfirmDeleteAccount = () => {
    setIsDeleteDialogOpen(false);
    announce('Your account has been deleted.', 'assertive');
    deleteTriggerRef.current?.focus();

    void fetch("/api/profile/delete", { method: "POST" }).catch(() => null);
  };

  // Format expiry time text
  const formatExpiryTime = () => {
    if (isExpired || expirySeconds <= 0) {
      return 'Code has expired. Please make a new code.';
    }
    const minutes = Math.floor(expirySeconds / 60);
    const seconds = expirySeconds % 60;
    return `Code expires in ${minutes} minute${minutes === 1 ? '' : 's'} ${seconds} second${
      seconds === 1 ? '' : 's'
    }.`;
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 bg-white text-slate-900 min-h-screen"
      aria-labelledby="profile-page-title"
    >
      {/* Page Header (F0 Rule 2, 7: Single h1 with focusable ref & top actions) */}
      <header className="space-y-4 border-b border-slate-200 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1
            ref={h1Ref}
            id="profile-page-title"
            tabIndex={-1}
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
          >
            Learner profile and settings
          </h1>

          {/* Top Actions: Language Switch & Quick Help Link */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              id="profile-lang-toggle-btn"
              className="min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs border border-orange-500/80 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
              <span>{isAmharic ? 'ቋንቋ፡ አማርኛ' : 'Language: English'}</span>
            </button>

            <Link
              href="/help"
              className="min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Accessibility Help</span>
            </Link>
          </div>
        </div>

        <p className="text-base text-slate-700 max-w-3xl leading-relaxed">
          Manage your personal details, accessibility settings, preferred language, job alerts,
          Telegram connection, and privacy. Everything works with keyboard, screen reader, and speech.
        </p>
      </header>

      {/* SECTION 1: Personal details */}
      <section aria-labelledby="heading-personal-details" className="space-y-6">
        <div className="p-6 sm:p-8 bg-white border-2 border-slate-300 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <User className="w-5 h-5 text-orange-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-personal-details" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Personal details
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Update your contact details so helpers and employers can reach you.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePersonalDetails} className="space-y-5 pt-2">
            <div className="space-y-1.5 w-full">
              <label htmlFor="personal-full-name" className="block text-sm font-bold text-slate-900">
                Full name <span className="text-orange-600 font-semibold">(required)</span>
              </label>
              <input
                id="personal-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] transition-colors focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="space-y-1.5 w-full">
              <label htmlFor="personal-email-address" className="block text-sm font-bold text-slate-900">
                Email address <span className="text-orange-600 font-semibold">(required)</span>
              </label>
              <p id="personal-email-hint" className="text-xs text-slate-600">
                Used for course notifications and secure sign-in.
              </p>
              <input
                id="personal-email-address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-describedby="personal-email-hint"
                required
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] transition-colors focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="space-y-1.5 w-full">
              <label htmlFor="personal-phone-number" className="block text-sm font-bold text-slate-900">
                Phone number
              </label>
              <p id="personal-phone-hint" className="text-xs text-slate-600">
                Format: +251 91 123 4567
              </p>
              <input
                id="personal-phone-number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                aria-describedby="personal-phone-hint"
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] transition-colors focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                className="min-h-[44px] px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-orange-400/40 cursor-pointer text-sm"
              >
                Save personal details
              </button>
              {personalDetailsSaved && (
                <span className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5" role="status">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* SECTION 2: Accessibility settings */}
      <section aria-labelledby="heading-a11y-settings" className="space-y-6">
        <div className="p-6 sm:p-8 bg-white border-2 border-slate-300 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <Sliders className="w-5 h-5 text-orange-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-a11y-settings" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Accessibility settings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Customize how Ableway looks, sounds, and interacts with your assistive technology.
              </p>
            </div>
          </div>

          <div className="space-y-6 pt-2">
            {/* Assistant interaction mode */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-slate-900">
                Assistant interaction mode:
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'voice-first',
                    name: 'Voice Mode',
                    desc: 'The app speaks aloud and listens for speech.',
                  },
                  {
                    id: 'screen-reader',
                    name: 'Screen Reader',
                    desc: 'Silent mode. Output goes to NVDA/JAWS live regions.',
                  },
                  {
                    id: 'hybrid',
                    name: 'Hybrid Mode',
                    desc: 'Combines screen reader text and optional audio.',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id as any);
                      announce(`Interaction mode set to ${item.name}.`, 'polite');
                    }}
                    className={`p-4 rounded-xl text-left border-2 min-h-[44px] transition-all flex flex-col justify-between ${
                      mode === item.id
                        ? 'bg-orange-50/90 border-orange-500 text-slate-900 shadow-sm ring-2 ring-orange-400/30'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    aria-pressed={mode === item.id}
                  >
                    <span className="font-bold text-sm text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-600 mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Contrast Theme */}
            <div className="space-y-1.5 w-full">
              <label htmlFor="a11y-contrast-theme" className="block text-sm font-bold text-slate-900">
                Contrast theme
              </label>
              <p id="a11y-theme-hint" className="text-xs text-slate-600">
                Optimized for low-vision learners and outdoor reading.
              </p>
              <select
                id="a11y-contrast-theme"
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value as any);
                  announce(`Theme changed to ${e.target.options[e.target.selectedIndex].text}.`, 'polite');
                }}
                aria-describedby="a11y-theme-hint"
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              >
                <option value="default">Default Theme (Standard 4.5:1 contrast)</option>
                <option value="high-contrast">High Contrast Theme (WCAG AAA 7:1+)</option>
                <option value="dark-contrast">Pure Black OLED (High contrast black)</option>
                <option value="yellow-black">Yellow on Black (High visibility)</option>
              </select>
            </div>

            {/* Text Sizing */}
            <div className="space-y-1.5 w-full">
              <label htmlFor="a11y-text-size" className="block text-sm font-bold text-slate-900">
                Text size
              </label>
              <p id="a11y-size-hint" className="text-xs text-slate-600">
                Scales all text across the interface up to 200% without layout breakage.
              </p>
              <select
                id="a11y-text-size"
                value={fontSize}
                onChange={(e) => {
                  setFontSize(e.target.value as any);
                  announce(`Text size set to ${e.target.options[e.target.selectedIndex].text}.`, 'polite');
                }}
                aria-describedby="a11y-size-hint"
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              >
                <option value="normal">Normal (100% - 18px base)</option>
                <option value="large">Large (125% - 22.5px base)</option>
                <option value="x-large">Extra Large (150% - 27px base)</option>
                <option value="xx-large">Maximum (180% - 32px base)</option>
              </select>
            </div>

            {/* Global Keyboard Shortcuts Toggle (F0 Rule 9) */}
            <div className="pt-2">
              <label htmlFor="a11y-keyboard-shortcuts" className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                <input
                  id="a11y-keyboard-shortcuts"
                  type="checkbox"
                  checked={shortcutsEnabled}
                  onChange={(e) => {
                    setShortcutsEnabled(e.target.checked);
                    announce(
                      e.target.checked
                        ? 'Global keyboard shortcuts enabled.'
                        : 'Global keyboard shortcuts disabled.',
                      'polite'
                    );
                  }}
                  className="w-5 h-5 mt-0.5 rounded text-orange-600 border-2 border-slate-300 focus:ring-orange-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    Enable global keyboard shortcuts
                  </span>
                  <span className="text-xs text-slate-600 block mt-0.5">
                    Allows using Alt+Shift+V for voice assistant and Alt+Shift+H for quick help.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Language */}
      <section aria-labelledby="heading-language" className="space-y-6">
        <div className="p-6 sm:p-8 bg-white border-2 border-slate-300 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <Languages className="w-5 h-5 text-orange-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-language" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Language
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Select your primary language for courses, voice assistant, and Telegram notifications.
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-1.5 w-full">
            <label htmlFor="profile-language-select" className="block text-sm font-bold text-slate-900">
              Preferred language
            </label>
            <p id="profile-lang-hint" className="text-xs text-slate-600">
              Changing language updates screen reader pronunciation and interface text.
            </p>
            <select
              id="profile-language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-describedby="profile-lang-hint"
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            >
              <option value="en">English</option>
              <option value="am-ET">Amharic (አማርኛ)</option>
              <option value="om-ET">Afaan Oromoo</option>
              <option value="ti-ET">Tigrinya (ትግርኛ)</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION 4: Alerts */}
      <section aria-labelledby="heading-alerts" className="space-y-6">
        <div className="p-6 sm:p-8 bg-white border-2 border-slate-300 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <Bell className="w-5 h-5 text-orange-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-alerts" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Alerts
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Set up job search alerts to receive notifications when verified accessible jobs match your interests.
              </p>
            </div>
          </div>

          <div className="space-y-8 pt-2">
            {/* Form to add a new alert */}
            <form onSubmit={handleAddAlert} noValidate className="p-5 sm:p-6 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-4">
              <h3 id="heading-add-alert" className="text-lg font-bold text-slate-900">
                Add a job alert
              </h3>

              {alertFormError && (
                <div role="alert" className="p-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 text-sm font-medium">
                  {alertFormError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 w-full">
                  <label htmlFor="alert-keywords-input" className="block text-sm font-bold text-slate-900">
                    Keywords <span className="text-orange-600 font-semibold">(required)</span>
                  </label>
                  <p id="alert-keywords-hint" className="text-xs text-slate-600">
                    E.g., Customer service, screen reader tester, Python
                  </p>
                  <input
                    ref={alertKeywordsInputRef}
                    id="alert-keywords-input"
                    type="text"
                    value={alertKeywords}
                    onChange={(e) => setAlertKeywords(e.target.value)}
                    aria-describedby="alert-keywords-hint"
                    aria-invalid={Boolean(alertFormError)}
                    required
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                  {alertFormError && (
                    <p id="alert-keywords-error" className="text-xs text-red-700 font-medium pt-0.5" role="alert">
                      {alertFormError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 w-full">
                  <label htmlFor="alert-location-input" className="block text-sm font-bold text-slate-900">
                    Location
                  </label>
                  <p id="alert-location-hint" className="text-xs text-slate-600">
                    E.g., Remote, Addis Ababa, Hawassa
                  </p>
                  <input
                    id="alert-location-input"
                    type="text"
                    value={alertLocation}
                    onChange={(e) => setAlertLocation(e.target.value)}
                    aria-describedby="alert-location-hint"
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                <div className="space-y-1.5 w-full">
                  <label htmlFor="alert-job-type-select" className="block text-sm font-bold text-slate-900">
                    Job type
                  </label>
                  <select
                    id="alert-job-type-select"
                    value={alertJobType}
                    onChange={(e) => setAlertJobType(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Remote">Remote / Work from home</option>
                  </select>
                </div>

                <div className="space-y-1.5 w-full">
                  <label htmlFor="alert-channel-select" className="block text-sm font-bold text-slate-900">
                    Channel
                  </label>
                  <select
                    id="alert-channel-select"
                    value={alertChannel}
                    onChange={(e) => setAlertChannel(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base min-h-[44px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  >
                    <option value="Telegram">Telegram Bot</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS text message</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-orange-400/40 cursor-pointer text-sm"
                >
                  Add job alert
                </button>
              </div>
            </form>

            {/* List of active subscriptions */}
            <div className="space-y-4">
              <h3 id="heading-subscriptions" className="text-lg font-bold text-slate-900">
                Your active subscriptions
              </h3>

              {subscriptions.length === 0 ? (
                <p className="text-slate-600 text-sm italic">
                  You have no active job alerts. Create one above to get notified.
                </p>
              ) : (
                <ul className="space-y-3" aria-labelledby="heading-subscriptions">
                  {subscriptions.map((sub) => (
                    <li
                      key={sub.id}
                      className="p-4 bg-white border-2 border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{sub.keywords}</span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                              sub.active
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {sub.active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Location: <strong className="text-slate-900">{sub.location}</strong> &bull; Type:{' '}
                          <strong className="text-slate-900">{sub.jobType}</strong> &bull; Channel:{' '}
                          <strong className="text-slate-900">{sub.channel}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleTogglePause(sub)}
                          aria-label={
                            sub.active
                              ? `Pause alert for ${sub.keywords}`
                              : `Resume alert for ${sub.keywords}`
                          }
                          className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border-2 border-slate-300 rounded-xl flex items-center justify-center gap-1.5 flex-1 sm:flex-initial text-sm cursor-pointer"
                        >
                          {sub.active ? (
                            <>
                              <Pause className="w-4 h-4 text-slate-700" aria-hidden="true" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 text-slate-700" aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubscription(sub)}
                          aria-label={`Delete alert for ${sub.keywords}`}
                          className="min-h-[44px] px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 font-bold border-2 border-red-300 rounded-xl flex items-center justify-center gap-1.5 flex-1 sm:flex-initial text-sm cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-700" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Telegram */}
      <section aria-labelledby="heading-telegram" className="space-y-6">
        <div className="p-6 sm:p-8 bg-white border-2 border-slate-300 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <Send className="w-5 h-5 text-orange-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-telegram" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Telegram
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Connect your account to the Ableway Telegram bot for mobile job alerts and learning support.
              </p>
            </div>
          </div>

          <div className="space-y-6 pt-2">
            {/* Plain language explanation: what it allows and what it does not */}
            <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-4 text-sm leading-relaxed text-slate-700">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>What linking allows:</span>
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                  <li>
                    <strong>Job help:</strong> Ask questions, prepare for interviews, and get guidance directly on Telegram.
                  </li>
                  <li>
                    <strong>Alerts:</strong> Receive immediate notifications when new accessible jobs match your profile.
                  </li>
                  <li>
                    <strong>Help using Telegram:</strong> The assistant can guide you with step-by-step instructions.
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" aria-hidden="true" />
                  <span>What the bot cannot do:</span>
                </h3>
                <p className="text-slate-700 text-sm">
                  The bot <strong>cannot see or read</strong> your other chats, personal messages, or contact lists in Telegram. It only reads messages you send directly to <strong>@AblewayBot</strong>.
                </p>
              </div>
            </div>

            {/* UNLINKED STATE */}
            {!isLinked ? (
              <div className="space-y-6">
                {!linkCode ? (
                  <div>
                    <button
                      type="button"
                      onClick={handleConnectTelegram}
                      className="min-h-[48px] px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-orange-400/40 text-base cursor-pointer"
                    >
                      Connect Telegram
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border-2 border-orange-500/60 rounded-2xl space-y-6 shadow-sm">
                    {/* Ordered list of 4 steps */}
                    <div className="space-y-3">
                      <h3 id="telegram-steps-title" className="font-bold text-slate-900 text-base">
                        Steps to connect:
                      </h3>
                      <ol
                        aria-labelledby="telegram-steps-title"
                        className="list-decimal pl-5 space-y-2 text-sm text-slate-700 font-medium"
                      >
                        <li>Open Telegram on your phone or computer.</li>
                        <li>
                          Search for the bot <strong>@AblewayBot</strong>.
                        </li>
                        <li>Press the <strong>Start</strong> button in the chat.</li>
                        <li>Send this code to the bot.</li>
                      </ol>
                    </div>

                    {/* Large text code display */}
                    <div className="p-6 bg-white border-2 border-orange-300 rounded-2xl text-center space-y-3 shadow-inner">
                      <span className="block text-xs uppercase tracking-widest font-bold text-orange-600">
                        Your one-time linking code:
                      </span>
                      <div
                        className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-widest"
                        aria-label={`Linking code: ${linkCode.split('').join(' ')}`}
                      >
                        {linkCode.slice(0, 3)} {linkCode.slice(3)}
                      </div>

                      {/* Expiry time as text */}
                      <p
                        className={`text-sm font-semibold ${
                          isExpired ? 'text-red-700 font-bold' : 'text-slate-700'
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        {formatExpiryTime()}
                      </p>
                    </div>

                    {/* Action buttons: Copy code, Read code slowly, Make a new code */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border-2 border-slate-300 rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer"
                        aria-label="Copy code to clipboard"
                      >
                        <Copy className="w-4 h-4 text-slate-700" aria-hidden="true" />
                        <span>{isCopied ? 'Code copied!' : 'Copy code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReadCodeSlowly}
                        className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border-2 border-slate-300 rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer"
                        aria-label="Let the assistant read code slowly character by character"
                      >
                        <Volume2 className="w-4 h-4 text-orange-600" aria-hidden="true" />
                        <span>Read code slowly</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleConnectTelegram}
                        className="min-h-[44px] px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold border-2 border-slate-300 rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-600" aria-hidden="true" />
                        <span>Make a new code</span>
                      </button>

                      {/* Simulator button for automated tests & demos */}
                      <button
                        type="button"
                        onClick={handleSimulateLinkConnected}
                        className="text-xs text-slate-500 hover:text-slate-700 underline py-2 px-3 ml-auto min-h-[44px]"
                        aria-label="Simulate Telegram connection for demo"
                      >
                        [Demo: Simulate link]
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LINKED STATE */
              <div className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-4 text-emerald-950 shadow-sm">
                <div className="flex items-center gap-3 font-bold text-lg text-emerald-900">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" aria-hidden="true" />
                  <span>Status: Connected</span>
                </div>
                <p className="text-sm text-emerald-900">
                  Your Telegram account is actively linked to <strong>@AblewayBot</strong>. You are receiving instant job alerts and course assistance.
                </p>

                <div className="pt-2">
                  <button
                    ref={unlinkTriggerRef}
                    type="button"
                    onClick={() => setIsUnlinkDialogOpen(true)}
                    className="min-h-[44px] px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Unlink Telegram</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 6: Privacy and data */}
      <section aria-labelledby="heading-privacy-data" className="space-y-6">
        <div className="p-6 sm:p-8 bg-white border-2 border-slate-300 rounded-2xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
              <Shield className="w-5 h-5 text-orange-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-privacy-data" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Privacy and data
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Export a complete copy of your personal data or permanently remove your account from our platform.
              </p>
            </div>
          </div>

          <div className="space-y-6 pt-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              We respect your right to privacy and ownership of your personal information. You can download your data at any time or request account erasure.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                ref={exportTriggerRef}
                type="button"
                onClick={() => setIsExportDialogOpen(true)}
                className="min-h-[44px] px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border-2 border-slate-300 rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-700" aria-hidden="true" />
                <span>Export my data</span>
              </button>

              <button
                ref={deleteTriggerRef}
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="min-h-[44px] px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-800 font-bold border-2 border-red-300 rounded-xl flex items-center gap-2 text-sm shadow-sm cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-red-700" aria-hidden="true" />
                <span>Delete my account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONFIRMATION DIALOG: Unlink Telegram */}
      <Dialog
        isOpen={isUnlinkDialogOpen}
        onClose={() => setIsUnlinkDialogOpen(false)}
        title="Unlink Telegram account"
        description="Are you sure you want to unlink Telegram? You will stop receiving job alerts on Telegram."
        triggerRef={unlinkTriggerRef}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            Disconnecting will stop all automated alerts and advice from being sent to your Telegram app. You can link your account again at any time.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUnlinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmUnlink}
            >
              Yes, unlink Telegram
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRMATION DIALOG: Export Data */}
      <Dialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        title="Export your personal data"
        description="Download a full copy of your personal details, accessibility settings, and job alerts in JSON format."
        triggerRef={exportTriggerRef}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            Your file includes your profile information, course enrollments, active job search alerts, and accessibility preferences.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmExport}
            >
              Download my data
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRMATION DIALOG: Delete Account */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Permanently delete your account"
        description="Are you sure you want to permanently delete your account? This action cannot be undone."
        triggerRef={deleteTriggerRef}
      >
        <div className="space-y-5">
          <p className="text-sm text-red-900 bg-red-50 p-3.5 rounded-xl border-2 border-red-300 font-medium">
            Warning: This will immediately delete all your saved course progress, certificate records, active job search alerts, and personal details.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDeleteAccount}
            >
              Yes, permanently delete my account
            </Button>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
