'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { playEarcon } from '@/lib/audio/earcons';
import {
  Button,
  TextField,
  SelectField,
  Checkbox,
  Dialog,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';

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
  } = useA11y();

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

  // Trigger refs for returning focus after dialog close (Rule 8)
  const unlinkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const exportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const alertKeywordsInputRef = useRef<HTMLInputElement | null>(null);

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

  // Simulated link event (for tests and quick demonstration)
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
  };

  // Handle Delete Account Confirmation
  const handleConfirmDeleteAccount = () => {
    setIsDeleteDialogOpen(false);
    announce('Your account has been deleted.', 'assertive');
    deleteTriggerRef.current?.focus();
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
      className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10"
      aria-labelledby="profile-page-title"
    >
      {/* Page Header (Rule 2: single H1 with sequential headings) */}
      <header className="space-y-3 border-b border-slate-800 pb-6">
        <h1 id="profile-page-title" className="text-3xl sm:text-4xl font-extrabold text-white">
          Learner profile and settings
        </h1>
        <p className="text-slate-300 text-base leading-relaxed">
          Manage your personal details, accessibility settings, preferred language, job alerts,
          Telegram connection, and privacy.
        </p>
      </header>

      {/* SECTION 1: Personal details */}
      <section aria-labelledby="heading-personal-details" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              <h2 id="heading-personal-details" className="text-2xl font-bold text-white">
                Personal details
              </h2>
            </div>
            <CardDescription>
              Update your contact details so helpers and employers can reach you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePersonalDetails} className="space-y-5">
              <TextField
                id="personal-full-name"
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />

              <TextField
                id="personal-email-address"
                type="email"
                label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                hint="Used for course notifications and secure sign-in."
                required
              />

              <TextField
                id="personal-phone-number"
                type="tel"
                label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                hint="Format: +251 91 123 4567"
              />

              <div className="flex items-center gap-4 pt-2">
                <Button type="submit" variant="primary">
                  Save personal details
                </Button>
                {personalDetailsSaved && (
                  <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5" role="status">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Saved</span>
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* SECTION 2: Accessibility settings */}
      <section aria-labelledby="heading-a11y-settings" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sliders className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              <h2 id="heading-a11y-settings" className="text-2xl font-bold text-white">
                Accessibility settings
              </h2>
            </div>
            <CardDescription>
              Customize how Ableway looks, sounds, and interacts with your assistive technology.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assistant interaction mode */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-slate-100">
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
                    className={`p-4 rounded-xl text-left border min-h-[44px] transition-all flex flex-col justify-between ${
                      mode === item.id
                        ? 'bg-emerald-950/80 border-emerald-400 text-white ring-2 ring-emerald-500'
                        : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                    aria-pressed={mode === item.id}
                  >
                    <span className="font-bold text-sm text-white">{item.name}</span>
                    <span className="text-xs text-slate-300 mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Contrast Theme */}
            <SelectField
              id="a11y-contrast-theme"
              label="Contrast theme"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value as any);
                announce(`Theme changed to ${e.target.options[e.target.selectedIndex].text}.`, 'polite');
              }}
              options={[
                { value: 'default', label: 'Default Theme (Standard 4.5:1 contrast)' },
                { value: 'high-contrast', label: 'High Contrast Theme (WCAG AAA 7:1+)' },
                { value: 'dark-contrast', label: 'Pure Black OLED (High contrast black)' },
                { value: 'yellow-black', label: 'Yellow on Black (High visibility)' },
              ]}
              hint="Optimized for low-vision learners and outdoor reading."
            />

            {/* Text Sizing */}
            <SelectField
              id="a11y-text-size"
              label="Text size"
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value as any);
                announce(`Text size set to ${e.target.options[e.target.selectedIndex].text}.`, 'polite');
              }}
              options={[
                { value: 'normal', label: 'Normal (100% - 18px base)' },
                { value: 'large', label: 'Large (125% - 22.5px base)' },
                { value: 'x-large', label: 'Extra Large (150% - 27px base)' },
                { value: 'xx-large', label: 'Maximum (180% - 32px base)' },
              ]}
              hint="Scales all text across the interface up to 200% without layout breakage."
            />

            {/* Global Keyboard Shortcuts Toggle (Rule 9) */}
            <div className="pt-2">
              <Checkbox
                id="a11y-keyboard-shortcuts"
                label="Enable global keyboard shortcuts"
                hint="Allows using Alt+Shift+V for voice assistant and Alt+Shift+H for quick help."
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
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SECTION 3: Language */}
      <section aria-labelledby="heading-language" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Languages className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              <h2 id="heading-language" className="text-2xl font-bold text-white">
                Language
              </h2>
            </div>
            <CardDescription>
              Select your primary language for courses, voice assistant, and Telegram notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectField
              id="profile-language-select"
              label="Preferred language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'am-ET', label: 'Amharic (አማርኛ)' },
                { value: 'om-ET', label: 'Afaan Oromoo' },
                { value: 'ti-ET', label: 'Tigrinya (ትግርኛ)' },
              ]}
              hint="Changing language updates screen reader pronunciation and interface text."
            />
          </CardContent>
        </Card>
      </section>

      {/* SECTION 4: Alerts */}
      <section aria-labelledby="heading-alerts" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              <h2 id="heading-alerts" className="text-2xl font-bold text-white">
                Alerts
              </h2>
            </div>
            <CardDescription>
              Set up job search alerts to receive notifications when verified accessible jobs match your interests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Form to add a new alert */}
            <form onSubmit={handleAddAlert} noValidate className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
              <h3 id="heading-add-alert" className="text-lg font-bold text-white">
                Add a job alert
              </h3>

              {alertFormError && (
                <div role="alert" className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-red-200 text-sm">
                  {alertFormError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  ref={alertKeywordsInputRef}
                  id="alert-keywords-input"
                  label="Keywords"
                  value={alertKeywords}
                  onChange={(e) => setAlertKeywords(e.target.value)}
                  hint="E.g., Customer service, screen reader tester, Python"
                  error={alertFormError || undefined}
                  required
                />

                <TextField
                  id="alert-location-input"
                  label="Location"
                  value={alertLocation}
                  onChange={(e) => setAlertLocation(e.target.value)}
                  hint="E.g., Remote, Addis Ababa, Hawassa"
                />

                <SelectField
                  id="alert-job-type-select"
                  label="Job type"
                  value={alertJobType}
                  onChange={(e) => setAlertJobType(e.target.value)}
                  options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Part-time', label: 'Part-time' },
                    { value: 'Contract', label: 'Contract' },
                    { value: 'Internship', label: 'Internship' },
                    { value: 'Remote', label: 'Remote / Work from home' },
                  ]}
                />

                <SelectField
                  id="alert-channel-select"
                  label="Channel"
                  value={alertChannel}
                  onChange={(e) => setAlertChannel(e.target.value)}
                  options={[
                    { value: 'Telegram', label: 'Telegram Bot' },
                    { value: 'Email', label: 'Email' },
                    { value: 'SMS', label: 'SMS text message' },
                  ]}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary">
                  Add job alert
                </Button>
              </div>
            </form>

            {/* List of active subscriptions */}
            <div className="space-y-4">
              <h3 id="heading-subscriptions" className="text-lg font-bold text-white">
                Your active subscriptions
              </h3>

              {subscriptions.length === 0 ? (
                <p className="text-slate-400 text-sm italic">
                  You have no active job alerts. Create one above to get notified.
                </p>
              ) : (
                <ul className="space-y-3" aria-labelledby="heading-subscriptions">
                  {subscriptions.map((sub) => (
                    <li
                      key={sub.id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{sub.keywords}</span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                              sub.active
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}
                          >
                            {sub.active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Location: <strong className="text-white">{sub.location}</strong> &bull; Type:{' '}
                          <strong className="text-white">{sub.jobType}</strong> &bull; Channel:{' '}
                          <strong className="text-white">{sub.channel}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleTogglePause(sub)}
                          aria-label={
                            sub.active
                              ? `Pause alert for ${sub.keywords}`
                              : `Resume alert for ${sub.keywords}`
                          }
                          className="flex items-center gap-1.5 flex-1 sm:flex-initial"
                        >
                          {sub.active ? (
                            <>
                              <Pause className="w-4 h-4" aria-hidden="true" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleDeleteSubscription(sub)}
                          aria-label={`Delete alert for ${sub.keywords}`}
                          className="flex items-center gap-1.5 flex-1 sm:flex-initial"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SECTION 5: Telegram */}
      <section aria-labelledby="heading-telegram" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              <h2 id="heading-telegram" className="text-2xl font-bold text-white">
                Telegram
              </h2>
            </div>
            <CardDescription>
              Connect your account to the Ableway Telegram bot for mobile job alerts and learning support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plain language explanation: what it allows and what it does not */}
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4 text-sm leading-relaxed">
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                  <span>What linking allows:</span>
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
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

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                  <span>What the bot cannot do:</span>
                </h3>
                <p className="text-slate-300 text-sm">
                  The bot <strong>cannot see or read</strong> your other chats, personal messages, or contact lists in Telegram. It only reads messages you send directly to <strong>@AblewayBot</strong>.
                </p>
              </div>
            </div>

            {/* UNLINKED STATE */}
            {!isLinked ? (
              <div className="space-y-6">
                {!linkCode ? (
                  <div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleConnectTelegram}
                      className="w-full sm:w-auto text-base py-3.5 px-6"
                    >
                      Connect Telegram
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950 border-2 border-emerald-600/70 rounded-3xl space-y-6">
                    {/* Ordered list of 4 steps */}
                    <div className="space-y-3">
                      <h3 id="telegram-steps-title" className="font-bold text-white text-base">
                        Steps to connect:
                      </h3>
                      <ol
                        aria-labelledby="telegram-steps-title"
                        className="list-decimal pl-5 space-y-2 text-sm text-slate-200"
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
                    <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl text-center space-y-3">
                      <span className="block text-xs uppercase tracking-widest font-bold text-emerald-400">
                        Your one-time linking code:
                      </span>
                      <div
                        className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest"
                        aria-label={`Linking code: ${linkCode.split('').join(' ')}`}
                      >
                        {linkCode.slice(0, 3)} {linkCode.slice(3)}
                      </div>

                      {/* Expiry time as text */}
                      <p
                        className={`text-sm font-semibold ${
                          isExpired ? 'text-red-400' : 'text-slate-300'
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        {formatExpiryTime()}
                      </p>
                    </div>

                    {/* Action buttons: Copy code, Read code slowly, Make a new code */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCopyCode}
                        className="flex items-center gap-2"
                        aria-label="Copy code to clipboard"
                      >
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        <span>{isCopied ? 'Code copied!' : 'Copy code'}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleReadCodeSlowly}
                        className="flex items-center gap-2"
                        aria-label="Let the assistant read code slowly character by character"
                      >
                        <Volume2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span>Read code slowly</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleConnectTelegram}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        <span>Make a new code</span>
                      </Button>

                      {/* Hidden simulator button for automated tests & demos */}
                      <button
                        type="button"
                        onClick={handleSimulateLinkConnected}
                        className="text-xs text-slate-500 hover:text-slate-300 underline py-2 px-3 ml-auto min-h-[44px]"
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
              <div className="p-6 bg-emerald-950/60 border border-emerald-600 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-emerald-300 font-bold text-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                  <span>Status: Connected</span>
                </div>
                <p className="text-sm text-slate-200">
                  Your Telegram account is actively linked to <strong>@AblewayBot</strong>. You are receiving instant job alerts and course assistance.
                </p>

                <div className="pt-2">
                  <Button
                    ref={unlinkTriggerRef}
                    type="button"
                    variant="danger"
                    onClick={() => setIsUnlinkDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Unlink Telegram</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 6: Privacy and data */}
      <section aria-labelledby="heading-privacy-data" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              <h2 id="heading-privacy-data" className="text-2xl font-bold text-white">
                Privacy and data
              </h2>
            </div>
            <CardDescription>
              Export a complete copy of your personal data or permanently remove your account from our platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-slate-300 leading-relaxed">
              We respect your right to privacy and ownership of your personal information. You can download your data at any time or request account erasure.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                ref={exportTriggerRef}
                type="button"
                variant="secondary"
                onClick={() => setIsExportDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export my data</span>
              </Button>

              <Button
                ref={deleteTriggerRef}
                type="button"
                variant="danger"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Delete my account</span>
              </Button>
            </div>
          </CardContent>
        </Card>
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
          <p className="text-sm text-slate-200">
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
          <p className="text-sm text-slate-200">
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
          <p className="text-sm text-red-200 bg-red-950/80 p-3 rounded-xl border border-red-700">
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
