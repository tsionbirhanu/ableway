'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Send,
  AlertCircle,
  CheckCircle2,
  Shield,
  Volume2,
  ArrowRight,
  RotateCcw,
  Globe,
} from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';
import { playEarcon } from '@/core/audio/earcons';

interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  consent: boolean;
  oneTimeCode: string;
}

type AssistantState =
  | 'idle'
  | 'intro'
  | 'ask_name'
  | 'confirm_name'
  | 'spell_name'
  | 'ask_email'
  | 'confirm_email'
  | 'spell_email'
  | 'ask_phone'
  | 'confirm_phone'
  | 'ask_language'
  | 'confirm_language'
  | 'read_privacy'
  | 'confirm_summary'
  | 'ask_code'
  | 'confirm_code'
  | 'completed';

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  preferredLanguage?: string;
  consent?: string;
  oneTimeCode?: string;
}

declare global {
  interface Window {
    __simulateVoiceInput?: (text: string) => void;
    fillField?: (field: keyof RegisterFormData, value: string | boolean) => void;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { announce, speak, mode, preferences, language, toggleLanguage, setLanguage } = useA11y();

  // Page Heading & Summary Refs for accessible focus management (F0 Rule 7 & 16)
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const oneTimeCodeInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    phone: '',
    preferredLanguage: 'en',
    consent: false,
    oneTimeCode: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [stage, setStage] = useState<'details' | 'verification' | 'success'>('details');

  // Assistant State
  const [assistantActive, setAssistantActive] = useState<boolean>(false);
  const [assistantStep, setAssistantStep] = useState<AssistantState>('idle');
  const [assistantSpokenText, setAssistantSpokenText] = useState<string>('');
  const [spellingBuffer, setSpellingBuffer] = useState<string>('');
  const [voiceInputText, setVoiceInputText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs tracking latest values for speech handlers & timers
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const assistantStepRef = useRef(assistantStep);
  assistantStepRef.current = assistantStep;

  const spellingBufferRef = useRef(spellingBuffer);
  spellingBufferRef.current = spellingBuffer;

  const assistantActiveRef = useRef(assistantActive);
  assistantActiveRef.current = assistantActive;

  // Function to start listening hands-free without clicking the mic button
  const startListeningRef = useRef<() => void>(() => {});

  // Speak assistant messages slowly and automatically receive voice hands-free
  const speakAssistant = useCallback(
    (text: string) => {
      // Mark speaking active so speech recognition stays muted and does not echo
      isSpeakingRef.current = true;
      setAssistantSpokenText(text);
      announce(text, 'polite');

      // Abort active recognition immediately so it doesn't hear assistant speech
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setIsListening(false);

      if (speechSafetyTimerRef.current) {
        clearTimeout(speechSafetyTimerRef.current);
        speechSafetyTimerRef.current = null;
      }

      if (mode === 'voice-first' && !preferences.suppressInAppTTS && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.80; // Slower speech rate for calm, clear accessibility (talk slow)
        utter.lang = language === 'am-ET' ? 'am-ET' : 'en-US';
        activeUtteranceRef.current = utter;
        (window as any).__activeUtterance = utter; // Prevent V8 garbage collection bug in Chromium

        const finishSpeaking = () => {
          if (speechSafetyTimerRef.current) {
            clearTimeout(speechSafetyTimerRef.current);
            speechSafetyTimerRef.current = null;
          }
          isSpeakingRef.current = false;
          activeUtteranceRef.current = null;
          // Hands-free: Wait 400ms after speech ends so room echo clears, then start listening
          setTimeout(() => {
            if (assistantActiveRef.current && assistantStepRef.current !== 'completed') {
              startListeningRef.current();
            }
          }, 400);
        };

        utter.onend = finishSpeaking;
        utter.onerror = finishSpeaking;

        // Safety timer: Chromium SpeechSynthesis occasionally fails to fire onend on Windows
        const words = text.split(/\s+/).length;
        const estimatedDurationMs = Math.max(3500, (words / (0.80 * 2.3)) * 1000 + 1500);
        speechSafetyTimerRef.current = setTimeout(finishSpeaking, estimatedDurationMs);

        window.speechSynthesis.speak(utter);
      } else {
        // In screen reader mode or if speech synthesis is not active, automatically open mic after delay
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (assistantActiveRef.current && assistantStepRef.current !== 'completed') {
            startListeningRef.current();
          }
        }, 1200);
      }
    },
    [announce, mode, preferences.suppressInAppTTS]
  );

  // Move focus to h1 on route change / page mount (F0 Rule 7)
  useEffect(() => {
    document.title = 'Create your account - Ableway';
    announce('Create your account page loaded. Use keyboard or start the spoken assistant.', 'polite');
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [announce]);

  // Core fillField function (Requirement: calls fillField, reads the value back)
  const fillField = useCallback(
    (field: keyof RegisterFormData, value: string | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Keep native DOM elements synchronized
      if (typeof document !== 'undefined') {
        const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement | HTMLSelectElement | null;
        if (input) {
          if (input.type === 'checkbox') {
            (input as HTMLInputElement).checked = Boolean(value);
          } else {
            input.value = String(value);
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Clear error for that field if present
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  // Expose fillField globally for testing and assistant tools
  useEffect(() => {
    window.fillField = fillField;
  }, [fillField]);

  // Clean strings
  const cleanSpokenInput = (text: string) => {
    return text.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
  };

  // Helper to parse letter-by-letter or spelled input
  const parseSpelledLetters = (input: string, isEmail: boolean = false): string => {
    let text = input.trim();
    if (isEmail) {
      text = text
        .replace(/\bat\b/gi, '@')
        .replace(/\bdot\b/gi, '.')
        .replace(/\s*@\s*/g, '@')
        .replace(/\s*\.\s*/g, '.');
    }
    const cleaned = text.replace(/[-_]/g, ' ');
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => p.length === 1 || p === '@' || p === '.')) {
      return parts.join('');
    }
    return text.replace(/\s+/g, isEmail ? '' : ' ');
  };

  // Assistant Question progression
  const startAssistant = useCallback(() => {
    isSpeakingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    playEarcon('listening');
    setAssistantActive(true);
    setAssistantStep('ask_name');
    const introMsg =
      language === 'am-ET'
        ? 'እንኳን ወደ ኤብልዌይ አካውንት መፍጠሪያ በደህና መጡ። ሙሉ ስምዎን፣ ኢሜይልዎን፣ ስልክዎን እና የግላዊነት ውልን አንድ በአንድ እጠይቆታለሁ። በመናገር ወይም በመተየብ መመለስ ይችላሉ። በማንኛውም ጊዜ ድገመው፣ ኢሜይል ቀይር ወይም ቀጥል ማለት ይችላሉ። ሙሉ ስምዎ ማን ነው?'
        : 'I will help you create your account. I will ask you for your full name, email, optional phone, preferred language, and privacy consent one by one. You can answer by speaking or typing. You can say repeat, change email, or next at any time. What is your full name?';
    speakAssistant(introMsg);
  }, [speakAssistant, language]);

  // Handle voice or assistant commands
  const handleAssistantCommand = useCallback(
    (rawInput: string) => {
      const input = rawInput.trim();
      if (!input) return;

      const lower = input.toLowerCase();
      const currentStep = assistantStepRef.current;
      const isAmharic = language === 'am-ET';

      // Bilingual affirmations and confirmations
      const isAffirm = (t: string) =>
        t === 'yes' ||
        t === 'yes that is right' ||
        t === 'yes thats right' ||
        t === 'that is right' ||
        t === 'thats right' ||
        t === 'right' ||
        t === 'correct' ||
        t === 'sure' ||
        t === 'ok' ||
        t === 'okay' ||
        t === 'next' ||
        t === 'submit' ||
        t === 'yes submit' ||
        t === 'yes please' ||
        t === 'confirm' ||
        t === 'i agree' ||
        t === 'yes i agree' ||
        t === 'agree' ||
        t === 'i consent' ||
        t === 'yes i consent' ||
        t === 'አዎ' ||
        t === 'አዎን' ||
        t === 'ትክክል ነው' ||
        t === 'ትክክል' ||
        t === 'እሺ' ||
        t === 'ይሁን' ||
        t.includes('እስማማለሁ') ||
        t.includes('አዎ እስማማለሁ');

      const isDeny = (t: string) =>
        t === 'no' ||
        t === 'not right' ||
        t === 'not yet' ||
        t === 'wrong' ||
        t.includes('not right') ||
        t.includes('wrong') ||
        t === 'አይ' ||
        t === 'አይደለም' ||
        t === 'አልስማማም' ||
        t === 'ገና ነው';

      // Amharic number word converter for OTP / digits
      const parseAmharicNumberWords = (t: string) =>
        t
          .replace(/\bአንድ\b/gi, '1')
          .replace(/\bሁለት\b/gi, '2')
          .replace(/\b(ሦስት|ሶስት)\b/gi, '3')
          .replace(/\bአራት\b/gi, '4')
          .replace(/\bአምስት\b/gi, '5')
          .replace(/\bስድስት\b/gi, '6')
          .replace(/\bሰባት\b/gi, '7')
          .replace(/\bስምንት\b/gi, '8')
          .replace(/\bዘጠኝ\b/gi, '9')
          .replace(/\bዜሮ\b/gi, '0');

      // 1. Global Navigation / Meta Voice Commands
      if (lower === 'repeat' || lower === 'ድገም' || lower === 'ድገመው' || lower === 'እንደገና') {
        switch (currentStep) {
          case 'ask_name':
            speakAssistant(
              isAmharic
                ? 'ሙሉ ስምዎ ማን ነው? ፊደል በፊደል ለመናገር ፊደል ማለት ይችላሉ።'
                : 'What is your full name? You can also say spell to spell it letter by letter.'
            );
            break;
          case 'confirm_name':
            speakAssistant(
              isAmharic
                ? `ስምዎ ${formDataRef.current.fullName} ተብሎ ተመዝግቧል። ትክክል ነው?`
                : `I entered ${formDataRef.current.fullName}. Is that right?`
            );
            break;
          case 'spell_name':
            speakAssistant(
              isAmharic
                ? `ፊደል በፊደል በማስገባት ላይ፦ ${spellingBufferRef.current || 'ምንም አልተገኘም'}። ፊደል ይናገሩ ወይም ሲጨርሱ ጨረስኩ ይበሉ።`
                : `Spelling full name. Current letters: ${spellingBufferRef.current || 'none'}. Say letters, or say done when finished.`
            );
            break;
          case 'ask_email':
            speakAssistant(
              isAmharic
                ? 'የኢሜይል አድራሻዎ ምንድን ነው? ፊደል ማለት ይችላሉ።'
                : 'What is your email address? You can also say spell.'
            );
            break;
          case 'confirm_email':
            speakAssistant(
              isAmharic
                ? `ኢሜይልዎ ${formDataRef.current.email} ተብሎ ተመዝግቧል። ትክክል ነው?`
                : `I entered ${formDataRef.current.email}. Is that right?`
            );
            break;
          case 'spell_email':
            speakAssistant(
              isAmharic
                ? `ኢሜይል በፊደል፦ ${spellingBufferRef.current || 'ምንም አልተገኘም'}።`
                : `Spelling email. Current: ${spellingBufferRef.current || 'none'}. Say letters, say at for @ and dot for period, or say done.`
            );
            break;
          case 'ask_phone':
            speakAssistant(
              isAmharic
                ? 'ስልክ ቁጥርዎ ምንድን ነው? ማስገባት ካልፈለጉ ዝለል ይበሉ።'
                : 'What is your phone number? This is optional. Say your number, or say next or skip.'
            );
            break;
          case 'confirm_phone':
            speakAssistant(
              isAmharic
                ? `ስልክ ቁጥርዎ ${formDataRef.current.phone} ተብሎ ተመዝግቧል። ትክክል ነው?`
                : `I entered ${formDataRef.current.phone}. Is that right?`
            );
            break;
          case 'ask_language':
            speakAssistant(
              isAmharic
                ? 'የሚመርጡት ቋንቋ ምንድን ነው? አማርኛ ወይም እንግሊዝኛ?'
                : 'What is your preferred language? English, Amharic, or Afaan Oromoo?'
            );
            break;
          case 'confirm_language':
            speakAssistant(
              isAmharic
                ? `ቋንቋ ${formDataRef.current.preferredLanguage} ተመርጧል። ትክክል ነው?`
                : `I selected ${formDataRef.current.preferredLanguage}. Is that right?`
            );
            break;
          case 'read_privacy':
            speakAssistant(
              isAmharic
                ? 'የኤብልዌይ የግላዊነት ውል፦ የግል መረጃዎ ለትምህርት አገልግሎት ብቻ የሚውል ሲሆን ለሶስተኛ ወገን አይተላለፍም። ውሉን ይቀበላሉ? እባክዎን አዎ ወይም አይ ይበሉ።'
                : 'Here is our plain-language privacy summary: We collect your name, email, phone number, and preferred language only to create your account, deliver lessons, and provide help. We never sell your personal information or share it with third parties to train AI models. Do you agree and give your consent?'
            );
            break;
          case 'confirm_summary':
            speakAssistant(
              isAmharic
                ? `የምዝገባ ማጠቃለያ፦ ስም: ${formDataRef.current.fullName}፣ ኢሜይል: ${formDataRef.current.email}። አሁን አካውንትዎን መፍጠር ይፈልጋሉ? አዎ ይበሉ።`
                : `Here is your registration summary: Full name: ${formDataRef.current.fullName}. Email: ${formDataRef.current.email}. Phone: ${formDataRef.current.phone || 'Not provided'}. Preferred language: ${formDataRef.current.preferredLanguage}. Privacy consent: Agreed. Do you want to submit your registration now?`
            );
            break;
          case 'ask_code':
            speakAssistant(
              isAmharic
                ? 'ባለ 6 ድጂት ማረጋገጫ ኮድዎን ይናገሩ።'
                : 'What is your 6-digit one-time code? Enter or say the code.'
            );
            break;
          case 'confirm_code':
            speakAssistant(
              isAmharic
                ? `የማረጋገጫ ኮድ ${formDataRef.current.oneTimeCode} ተመዝግቧል። ትክክል ነው?`
                : `I entered code ${formDataRef.current.oneTimeCode}. Is that right?`
            );
            break;
          default:
            speakAssistant(
              isAmharic
                ? 'በምዝገባዎ በምን ልርዳዎ?'
                : 'How can I help you with your registration?'
            );
        }
        return;
      }

      // 2. Jumping between fields with "change [field]" (English & Amharic)
      if (lower.includes('change name') || lower.includes('ስም ቀይር') || lower.includes('ስሜን ቀይር')) {
        setAssistantStep('ask_name');
        speakAssistant(
          isAmharic
            ? 'ስምዎን እንቀይር። ሙሉ ስምዎ ማን ነው?'
            : 'Let us change your name. What is your full name?'
        );
        return;
      }
      if (lower.includes('change email') || lower.includes('ኢሜይል ቀይር')) {
        setAssistantStep('ask_email');
        speakAssistant(
          isAmharic
            ? 'ኢሜይልዎን እንቀይር። የኢሜይል አድራሻዎ ምንድን ነው?'
            : 'Let us change your email. What is your email address?'
        );
        return;
      }
      if (lower.includes('change phone') || lower.includes('ስልክ ቀይር')) {
        setAssistantStep('ask_phone');
        speakAssistant(
          isAmharic
            ? 'ስልክ ቁጥርዎን እንቀይር። ስልክ ቁጥርዎ ምንድን ነው? ወይም ዝለል ይበሉ።'
            : 'Let us change your phone number. What is your phone number? Or say skip.'
        );
        return;
      }
      if (lower.includes('change language') || lower.includes('ቋንቋ ቀይር')) {
        setAssistantStep('ask_language');
        speakAssistant(
          isAmharic
            ? 'የመማሪያ ቋንቋዎን እንቀይር። አማርኛ ወይም እንግሊዝኛ?'
            : 'Let us change your preferred language. English, Amharic, or Afaan Oromoo?'
        );
        return;
      }

      // 3. Step-by-Step State Machine
      switch (currentStep) {
        // --- NAME ---
        case 'ask_name': {
          if (lower.includes('spell')) {
            setAssistantStep('spell_name');
            setSpellingBuffer('');
            speakAssistant('Spelling mode for full name. Please spell your name letter by letter, or say done when finished.');
            return;
          }
          if (lower === 'next' && formDataRef.current.fullName) {
            setAssistantStep('ask_email');
            speakAssistant('What is your email address?');
            return;
          }
          const val = input.replace(/^(my name is|i am|name is)\s+/i, '').trim();
          fillField('fullName', val);
          setAssistantStep('confirm_name');
          speakAssistant(`I entered ${val}. Is that right?`);
          break;
        }

        case 'spell_name': {
          if (lower === 'done' || lower.includes('done')) {
            const finalVal = spellingBufferRef.current.trim();
            fillField('fullName', finalVal);
            setAssistantStep('confirm_name');
            speakAssistant(`Spelled: ${finalVal.split('').join('-')}. I entered ${finalVal}. Is that right?`);
            return;
          }
          const parsed = parseSpelledLetters(input, false);
          const newBuf = (spellingBufferRef.current + parsed).trim();
          setSpellingBuffer(newBuf);
          fillField('fullName', newBuf);
          speakAssistant(`Building: ${newBuf}. Say more letters or say done.`);
          break;
        }

        case 'confirm_name': {
          if (isAffirm(lower)) {
            setAssistantStep('ask_email');
            speakAssistant(
              isAmharic
                ? 'በጣም ጥሩ። የኢሜይል አድራሻዎ ምንድን ነው?'
                : 'Great. What is your email address?'
            );
          } else if (isDeny(lower)) {
            setAssistantStep('ask_name');
            speakAssistant(
              isAmharic
                ? 'እንደገና እንሞክር። ሙሉ ስምዎ ማን ነው?'
                : 'Let us try again. What is your full name? You can also say spell.'
            );
          } else {
            speakAssistant(
              isAmharic
                ? `ስምዎ ${formDataRef.current.fullName} ትክክል ከሆነ አዎ ይበሉ፣ ወይም ለመቀየር አይ ይበሉ።`
                : `Please answer yes if ${formDataRef.current.fullName} is correct, or say no to change it.`
            );
          }
          break;
        }

        // --- EMAIL ---
        case 'ask_email': {
          if (lower.includes('spell')) {
            setAssistantStep('spell_email');
            setSpellingBuffer('');
            speakAssistant(
              isAmharic
                ? 'የኢሜይል ፊደል አገባብ። ፊደላትን አንድ በአንድ ይናገሩ፣ @ ለማለት at እና ነጥብ ለማለት dot ይበሉ።'
                : 'Spelling mode for email. Please spell your email letter by letter. Say at for @ and dot for period, or say done when finished.'
            );
            return;
          }
          if ((lower === 'next' || lower === 'ቀጥል') && formDataRef.current.email) {
            setAssistantStep('ask_phone');
            speakAssistant(
              isAmharic
                ? 'ስልክ ቁጥርዎ ምንድን ነው? ማስገባት ካልፈለጉ ዝለል ይበሉ።'
                : 'What is your phone number? This is optional. Say your number, or say next or skip.'
            );
            return;
          }
          const rawEmail = input.replace(/^(my email is|email is|ኢሜይሌ)\s+/i, '').trim();
          const parsedEmail = parseSpelledLetters(rawEmail, true).toLowerCase();
          fillField('email', parsedEmail);
          setAssistantStep('confirm_email');
          speakAssistant(
            isAmharic
              ? `ኢሜይልዎ ${parsedEmail} ተብሎ ተመዝግቧል። ትክክል ነው?`
              : `I entered ${parsedEmail}. Is that right?`
          );
          break;
        }

        case 'spell_email': {
          if (lower === 'done' || lower.includes('done') || lower === 'ጨረስኩ') {
            const finalEmail = parseSpelledLetters(spellingBufferRef.current, true).toLowerCase();
            fillField('email', finalEmail);
            setAssistantStep('confirm_email');
            speakAssistant(
              isAmharic
                ? `የተጻፈው ኢሜይል ${finalEmail} ነው። ትክክል ነው?`
                : `Spelled: ${finalEmail}. I entered ${finalEmail}. Is that right?`
            );
            return;
          }
          const parsed = parseSpelledLetters(input, true);
          const newBuf = (spellingBufferRef.current + parsed).trim();
          setSpellingBuffer(newBuf);
          fillField('email', parseSpelledLetters(newBuf, true).toLowerCase());
          speakAssistant(`Building email: ${newBuf}. Say more letters or say done.`);
          break;
        }

        case 'confirm_email': {
          if (isAffirm(lower)) {
            setAssistantStep('ask_phone');
            speakAssistant(
              isAmharic
                ? 'ስልክ ቁጥርዎ ምንድን ነው? ይህ አማራጭ ነው፣ መዝለል ከፈለጉ ዝለል ማለት ይችላሉ።'
                : 'What is your phone number? This is optional. Say your number, or say next or skip.'
            );
          } else if (isDeny(lower)) {
            setAssistantStep('ask_email');
            speakAssistant(
              isAmharic
                ? 'የኢሜይል አድራሻዎ ምንድን ነው?'
                : 'What is your email address? You can also say spell.'
            );
          } else {
            speakAssistant(
              isAmharic
                ? `ኢሜይልዎ ${formDataRef.current.email} ትክክል ከሆነ አዎ ይበሉ፣ ወይም ለመቀየር አይ ይበሉ።`
                : `Please answer yes if ${formDataRef.current.email} is correct, or say no to change it.`
            );
          }
          break;
        }

        // --- PHONE (OPTIONAL) ---
        case 'ask_phone': {
          if (
            lower === 'skip' ||
            lower === 'next' ||
            lower === 'none' ||
            lower === 'no' ||
            lower === 'no phone' ||
            lower === 'ዝለል' ||
            lower === 'አልፈልግም'
          ) {
            fillField('phone', '');
            setAssistantStep('ask_language');
            speakAssistant(
              isAmharic
                ? 'ስልክ ተዘሏል። የሚመርጡት የመማሪያ ቋንቋ ምንድን ነው? አማርኛ ወይም እንግሊዝኛ?'
                : 'Phone skipped. What is your preferred language? English, Amharic, or Afaan Oromoo?'
            );
            return;
          }
          const rawPhone = input.replace(/^(my phone is|phone is|number is|ስልኬ)\s+/i, '').trim();
          fillField('phone', rawPhone);
          setAssistantStep('confirm_phone');
          speakAssistant(
            isAmharic
              ? `ስልክ ቁጥርዎ ${rawPhone} ተብሎ ተመዝግቧል። ትክክል ነው?`
              : `I entered ${rawPhone}. Is that right?`
          );
          break;
        }

        case 'confirm_phone': {
          if (isAffirm(lower)) {
            setAssistantStep('ask_language');
            speakAssistant(
              isAmharic
                ? 'የሚመርጡት የመማሪያ ቋንቋ ምንድን ነው? አማርኛ ወይም እንግሊዝኛ?'
                : 'What is your preferred language? English, Amharic, or Afaan Oromoo?'
            );
          } else if (isDeny(lower)) {
            setAssistantStep('ask_phone');
            speakAssistant(
              isAmharic
                ? 'ስልክ ቁጥርዎን ያስገቡ ወይም ዝለል ይበሉ።'
                : 'What is your phone number? Or say skip.'
            );
          } else {
            speakAssistant(
              isAmharic
                ? `ስልክ ቁጥርዎ ${formDataRef.current.phone} ትክክል ከሆነ አዎ ይበሉ።`
                : `Please answer yes if ${formDataRef.current.phone} is correct, or say no to change it.`
            );
          }
          break;
        }

        // --- LANGUAGE ---
        case 'ask_language': {
          let selected = 'en';
          if (lower.includes('amharic') || lower.includes('am') || lower.includes('አማርኛ')) {
            selected = 'am';
          } else if (lower.includes('oromoo') || lower.includes('afaan') || lower.includes('om')) {
            selected = 'om';
          } else if (lower.includes('tigrinya') || lower.includes('ti')) {
            selected = 'ti';
          } else if (lower.includes('somali') || lower.includes('so')) {
            selected = 'so';
          } else {
            selected = 'en';
          }

          const labelMap: Record<string, string> = {
            en: 'English',
            am: 'Amharic',
            om: 'Afaan Oromoo',
            ti: 'Tigrinya',
            so: 'Somali',
          };

          fillField('preferredLanguage', selected);
          setAssistantStep('confirm_language');
          speakAssistant(
            isAmharic
              ? `የተመረጠው የመማሪያ ቋንቋ ${labelMap[selected] || selected} ነው። ትክክል ነው?`
              : `I selected ${labelMap[selected] || selected}. Is that right?`
          );
          break;
        }

        case 'confirm_language': {
          if (isAffirm(lower)) {
            setAssistantStep('read_privacy');
            speakAssistant(
              isAmharic
                ? 'የኤብልዌይ የግላዊነት ውል፦ የግል መረጃዎ ለትምህርት አገልግሎት ብቻ የሚውል ሲሆን ለሶስተኛ ወገን አይተላለፍም። ውሉን ይቀበላሉ? እባክዎን አዎ ወይም አይ ይበሉ።'
                : 'Here is our plain-language privacy summary: We collect your name, email, phone number, and preferred language only to create your account, deliver lessons, and provide help. We never sell your personal information or share it with third parties to train AI models. Do you agree and give your consent?'
            );
          } else if (isDeny(lower)) {
            setAssistantStep('ask_language');
            speakAssistant(
              isAmharic
                ? 'የሚመርጡት የመማሪያ ቋንቋ ምንድን ነው? አማርኛ ወይም እንግሊዝኛ?'
                : 'What is your preferred language? English, Amharic, or Afaan Oromoo?'
            );
          } else {
            speakAssistant(
              isAmharic
                ? 'ይህ ቋንቋ ትክክል ከሆነ አዎ ይበሉ፣ ወይም ሌላ ለመምረጥ አይ ይበሉ።'
                : 'Please answer yes if this language is correct, or say no to choose another.'
            );
          }
          break;
        }

        // --- PRIVACY CONSENT ---
        case 'read_privacy': {
          if (isAffirm(lower)) {
            fillField('consent', true);
            setAssistantStep('confirm_summary');
            const summary = isAmharic
              ? `ውሉ ተመዝግቧል። የምዝገባ ማጠቃለያ፦ ስም: ${formDataRef.current.fullName}፣ ኢሜይል: ${formDataRef.current.email}። አሁን አካውንትዎን መፍጠር ይፈልጋሉ? አዎ ይበሉ።`
              : `Consent recorded. Here is your full registration summary: Full name: ${formDataRef.current.fullName}. Email: ${formDataRef.current.email}. Phone: ${formDataRef.current.phone || 'Not provided'}. Preferred language: ${formDataRef.current.preferredLanguage}. Privacy consent: Agreed. Do you want to submit your registration now?`;
            speakAssistant(summary);
          } else {
            // Explicit yes required!
            fillField('consent', false);
            speakAssistant(
              isAmharic
                ? 'ውሉ አልተመዘገበም። ለመቀጠል የግላዊነት ውሉን በግልጽ አዎ በማለት መቀበል አለብዎት። ውሉን ይቀበላሉ?'
                : 'Consent has not been recorded. You must give an explicit yes to agree to the privacy notice before we can continue. Do you agree and give your consent?'
            );
          }
          break;
        }

        // --- FULL SUMMARY CONFIRMATION ---
        case 'confirm_summary': {
          if (isAffirm(lower)) {
            setStage('verification');
            setAssistantStep('ask_code');
            const codeMsg = isAmharic
              ? 'የምዝገባ መረጃው ተቀምጧል። ባለ 6 ድጂት ማረጋገጫ ኮድ ወደ ኢሜይልዎ ተልኳል። ማረጋገጫ ኮድዎን ይናገሩ።'
              : 'Registration details saved. A 6-digit one-time code was sent to your email. What is your one-time code?';
            speakAssistant(codeMsg);
            setTimeout(() => {
              if (oneTimeCodeInputRef.current) {
                oneTimeCodeInputRef.current.focus();
              }
            }, 300);
          } else if (isDeny(lower)) {
            speakAssistant(
              isAmharic
                ? 'ምዝገባው ቆሟል። ስም ቀይር፣ ኢሜይል ቀይር ወይም ስልክ ቀይር ማለት ይችላሉ።'
                : 'Submission paused. You can say change name, change email, change phone, change language, or submit when ready.'
            );
          } else {
            speakAssistant(
              isAmharic
                ? 'አካውንትዎን ለመፍጠር አዎ ይበሉ፣ ወይም መረጃ ለመቀየር ኢሜይል ቀይር ይበሉ።'
                : 'Please say yes to submit your registration, or say change email or repeat.'
            );
          }
          break;
        }

        // --- ONE-TIME CODE (SIGN-IN) ---
        case 'ask_code': {
          const withDigits = parseAmharicNumberWords(input);
          const rawCode = cleanSpokenInput(withDigits).replace(/\s+/g, '');
          fillField('oneTimeCode', rawCode);
          setAssistantStep('confirm_code');
          speakAssistant(
            isAmharic
              ? `የማረጋገጫ ኮድ ${rawCode.split('').join(' ')} ተመዝግቧል። ትክክል ነው?`
              : `I entered code ${rawCode.split('').join(' ')}. Is that right?`
          );
          break;
        }

        case 'confirm_code': {
          if (isAffirm(lower)) {
            completeRegistration();
          } else if (isDeny(lower)) {
            setAssistantStep('ask_code');
            speakAssistant(
              isAmharic
                ? 'ባለ 6 ድጂት ማረጋገጫ ኮድዎን ይናገሩ።'
                : 'What is your 6-digit one-time code?'
            );
          } else {
            speakAssistant(
              isAmharic
                ? 'ይህን ኮድ ለማረጋገጥ አዎ ይበሉ፣ ወይም እንደገና ለማስገባት አይ ይበሉ።'
                : 'Say yes to verify this one-time code, or say no to re-enter it.'
            );
          }
          break;
        }

        default:
          speakAssistant(
            isAmharic
              ? 'በምዝገባዎ በምን ልርዳዎ?'
              : 'How can I help you with your registration?'
          );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fillField, speakAssistant]
  );

  // Bind global simulation hook
  useEffect(() => {
    window.__simulateVoiceInput = (text: string) => {
      setVoiceInputText(text);
      handleAssistantCommand(text);
    };
  }, [handleAssistantCommand]);

  // Validation function (F0 Rule 16)
  const validateDetails = (): boolean => {
    const current = formDataRef.current;
    const newErrors: FormErrors = {};

    if (!current.fullName.trim()) {
      newErrors.fullName = 'Enter your full name';
    }

    if (!current.email.trim()) {
      newErrors.email = 'Enter an email like name@example.com';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email.trim())) {
      newErrors.email = 'Enter an email like name@example.com';
    }

    if (!current.preferredLanguage) {
      newErrors.preferredLanguage = 'Select your preferred language';
    }

    if (!current.consent) {
      newErrors.consent = 'You must check the consent box to agree to the privacy notice';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      playEarcon('error');
      // Announce and move focus to error summary (Rule 16)
      const errorCount = Object.keys(newErrors).length;
      announce(`The form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review the error summary.`, 'assertive');
      if (errorSummaryRef.current) {
        errorSummaryRef.current.focus();
      }
      return false;
    }

    return true;
  };

  // Keyboard / Form Submit: Step 1 (Details)
  const handleDetailsFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) {
      return;
    }

    // Advance to One-Time Code Verification
    setStage('verification');
    setAssistantStep('ask_code');
    const msg = `Registration details accepted. We sent a 6-digit one-time code to ${formData.email}. Enter or paste your code to sign in.`;
    announce(msg, 'polite');
    setAssistantSpokenText(msg);

    setTimeout(() => {
      if (oneTimeCodeInputRef.current) {
        oneTimeCodeInputRef.current.focus();
      }
    }, 200);
  };

  // Step 2: Verification with One-Time Code
  const completeRegistration = () => {
    const inputVal = oneTimeCodeInputRef.current?.value;
    const code = (inputVal || formDataRef.current.oneTimeCode || '').trim();
    if (!code || code.length < 4) {
      const err = { oneTimeCode: 'Enter the 6-digit one-time code sent to your email' };
      setErrors(err);
      playEarcon('error');
      announce('Invalid one-time code. Enter the 6-digit one-time code sent to your email.', 'assertive');
      if (errorSummaryRef.current) {
        errorSummaryRef.current.focus();
      }
      return;
    }

    // Success (Requirement: "Account created. Going to course choice" and redirect)
    setStage('success');
    setAssistantStep('completed');
    playEarcon('success');
    const successMsg = 'Account created. Going to course choice';
    announce(successMsg, 'polite');
    setAssistantSpokenText(successMsg);
    if (mode === 'voice-first' && !preferences.suppressInAppTTS) {
      speak(successMsg);
    }

    setTimeout(() => {
      router.push('/courses');
    }, 1800);
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeRegistration();
  };

  // Hands-free Web Speech API STT: Automatically receives voice without clicking mic button
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Mutex: Do not start listening while assistant is actively speaking
    if (isSpeakingRef.current) return;

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      announce('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'assertive');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const rec = new SpeechRec();
      rec.lang = language === 'am-ET' ? 'am-ET' : 'en-US';
      rec.interimResults = true;
      rec.continuous = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (evt: any) => {
        // If speaking flag is active, ignore incoming audio
        if (isSpeakingRef.current) return;

        let interim = '';
        let final = '';

        for (let i = evt.resultIndex; i < evt.results.length; ++i) {
          const res = evt.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        // Live visual transcript so learner immediately sees speech received
        if (interim.trim()) {
          setVoiceInputText(interim.trim());
        }

        if (final.trim()) {
          const finalTrimmed = final.trim();
          setVoiceInputText(finalTrimmed);
          handleAssistantCommand(finalTrimmed);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          announce('Microphone permission not granted. Please allow microphone access or type your answers.', 'assertive');
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Hands-free continuous auto-receive:
        // Only reconnect if assistant is NOT speaking and is still active
        if (!isSpeakingRef.current && assistantActiveRef.current && assistantStepRef.current !== 'completed') {
          setTimeout(() => {
            if (!isSpeakingRef.current && assistantActiveRef.current && assistantStepRef.current !== 'completed') {
              try {
                rec.start();
              } catch {}
            }
          }, 350);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
    }
  }, [handleAssistantCommand, announce]);

  // Bind ref for speakAssistant auto-receive
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Manual toggle for microphone: always forces mic to listen and unlocks state
  const toggleListening = () => {
    // Unlock speaking mutex in case user clicks mic to speak
    isSpeakingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isListening) {
      try {
        recognitionRef.current?.abort();
      } catch {}
      setIsListening(false);
      playEarcon('stop');
      announce('Microphone paused.', 'polite');
    } else {
      playEarcon('listening');
      startListening();
      announce('Microphone active. Listening for your response.', 'polite');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 bg-white text-slate-900 min-h-screen">
      {/* Page Header (F0 Rule 2: Single h1, unique descriptive title, logical headings) */}
      <header className="space-y-3">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight focus:outline-none"
        >
          Create your account
        </h1>
        <p className="text-base text-slate-700 max-w-2xl leading-relaxed">
          Join Ableway to access accessible courses, audio lessons, and human assistance. You can fill this form by keyboard, or start the spoken assistant to answer by voice hands-free. Already have an account?{' '}
          <Link
            href="/login"
            className="underline font-bold text-orange-800 hover:text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-0.5"
          >
            Sign in here
          </Link>.
        </p>
      </header>

      {/* Voice Assistant Section (Navy & Orange Accents, Hands-free auto-receive without shaking) */}
      <section
        aria-label="Spoken Registration Assistant"
        className="bg-slate-50 border-2 border-[#0B132B] rounded-xl p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B132B] border border-orange-500/50 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
              <Volume2 className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Spoken Assistant</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#0B132B] text-orange-400 border border-orange-500/50">
                  Hands-Free Voice Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {assistantActive
                  ? 'Speaking slowly and listening automatically without needing to click the mic button.'
                  : 'Start the assistant once to guide you hands-free question by question.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Language Switch Button */}
            <button
              type="button"
              onClick={() => {
                toggleLanguage();
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.abort();
                  } catch {}
                }
              }}
              id="reg-lang-switch-btn"
              aria-label={`${language === 'am-ET' ? 'ቋንቋ፡ አማርኛ' : 'Language: English'} - Switch language / ቋንቋ ቀይር`}
              className="min-h-[44px] px-3.5 py-2 rounded-lg font-bold text-xs border border-orange-500/80 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
              <span>{language === 'am-ET' ? 'ቋንቋ፡ አማርኛ' : 'Language: English'}</span>
            </button>

            {!assistantActive ? (
              <button
                type="button"
                onClick={startAssistant}
                id="start-voice-assistant-btn"
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-5 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold text-sm rounded-lg flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <span>{language === 'am-ET' ? 'የድምጽ ረዳቱን ጀምር' : 'Start Voice Assistant'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAssistantActive(false);
                  setAssistantStep('idle');
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                    } catch {}
                  }
                  setIsListening(false);
                  announce(
                    language === 'am-ET'
                      ? 'የድምጽ ረዳቱ ቆሟል። በኪቦርድዎ መቀጠል ይችላሉ።'
                      : 'Voice assistant stopped. You can continue using your keyboard.',
                    'polite'
                  );
                }}
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-300 shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'am-ET' ? 'ረዳቱን አቁም' : 'Pause Assistant'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Assistant Spoken Message Display & Live Region */}
        {assistantActive && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between min-h-[26px]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B132B] uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" aria-hidden="true" />
                <span>Assistant says:</span>
              </div>
              <div className="h-6 flex items-center">
                {isListening ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                    Listening hands-free...
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Speaking slowly...</span>
                )}
              </div>
            </div>

            <p
              data-testid="assistant-speech-display"
              className="text-base text-slate-900 font-medium leading-relaxed"
              aria-live="polite"
            >
              {assistantSpokenText || 'Starting your registration assistant...'}
            </p>

            {/* Quick spoken commands guide */}
            <p className="text-xs text-slate-600 pt-1">
              Spoken commands you can say anytime: <strong className="text-slate-900">&quot;repeat&quot;</strong>,{' '}
              <strong className="text-slate-900">&quot;next&quot;</strong>,{' '}
              <strong className="text-slate-900">&quot;spell&quot;</strong>, or{' '}
              <strong className="text-slate-900">&quot;change email&quot;</strong>.
            </p>

            {/* Spoken Input Bar (accessible to both voice & keyboard) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssistantCommand(voiceInputText);
                setVoiceInputText('');
              }}
              className="pt-2 flex items-center gap-2"
              aria-label="Spoken assistant answer form"
            >
              <label htmlFor="assistant-voice-input" className="sr-only">
                Speak or type answer to assistant
              </label>
              <input
                id="assistant-voice-input"
                name="assistantVoiceInput"
                type="text"
                data-testid="assistant-voice-input"
                value={voiceInputText}
                onChange={(e) => setVoiceInputText(e.target.value)}
                placeholder="Speak hands-free, or type e.g. 'Jane Doe', 'yes', 'spell'..."
                className="flex-1 min-h-[44px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400"
              />

              <button
                type="button"
                onClick={toggleListening}
                data-testid="assistant-voice-mic"
                className={`min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors border ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 border-orange-500'
                }`}
                aria-label={isListening ? 'Pause listening' : 'Listen with microphone'}
                aria-pressed={isListening}
                title={isListening ? 'Listening automatically' : 'Click to enable microphone'}
              >
                {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-orange-400" />}
              </button>

              <button
                type="submit"
                data-testid="assistant-voice-send"
                className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 border border-orange-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-4 h-4 text-orange-400" aria-hidden="true" />
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Error Summary (F0 Rule 16: Top summary with role="alert", focus moved to it, descriptive text) */}
      {Object.keys(errors).length > 0 && (
        <div
          ref={errorSummaryRef}
          id="error-summary"
          tabIndex={-1}
          role="alert"
          aria-labelledby="error-summary-title"
          className="bg-rose-50 border-2 border-rose-600 rounded-xl p-5 sm:p-6 text-rose-950 space-y-3 focus:outline-none focus:ring-4 focus:ring-rose-400 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-rose-700 shrink-0" aria-hidden="true" />
            <h2 id="error-summary-title" className="text-lg font-bold text-rose-900">
              There is a problem with your submission
            </h2>
          </div>
          <p className="text-sm text-rose-800">
            Please check the fields below and correct the errors:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-rose-800 font-medium">
            {errors.fullName && (
              <li>
                <a
                  href="#reg-name"
                  className="underline hover:text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1"
                >
                  {errors.fullName}
                </a>
              </li>
            )}
            {errors.email && (
              <li>
                <a
                  href="#reg-email"
                  className="underline hover:text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1"
                >
                  {errors.email}
                </a>
              </li>
            )}
            {errors.preferredLanguage && (
              <li>
                <a
                  href="#reg-lang"
                  className="underline hover:text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1"
                >
                  {errors.preferredLanguage}
                </a>
              </li>
            )}
            {errors.consent && (
              <li>
                <a
                  href="#reg-consent"
                  className="underline hover:text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1"
                >
                  {errors.consent}
                </a>
              </li>
            )}
            {errors.oneTimeCode && (
              <li>
                <a
                  href="#reg-otp"
                  className="underline hover:text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1"
                >
                  {errors.oneTimeCode}
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* STAGE 1: Standard Accessible Form (F0 Rule 1, 5, 15, 16 - Normal Clean UI Components) */}
      {stage === 'details' && (
        <form
          onSubmit={handleDetailsFormSubmit}
          noValidate
          className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm space-y-8"
        >
          {/* Fieldset 1: Personal Details */}
          <fieldset className="space-y-6">
            <legend className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 w-full">
              Personal Information
            </legend>

            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="reg-name" className="block text-sm font-semibold text-slate-800">
                Full name <span className="text-orange-800 font-normal text-xs">(required)</span>
              </label>
              <input
                id="reg-name"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={formData.fullName}
                onChange={(e) => fillField('fullName', e.target.value)}
                placeholder="e.g. Jane Doe"
                aria-describedby={`reg-name-desc ${errors.fullName ? 'reg-name-error' : ''}`}
                aria-invalid={errors.fullName ? 'true' : 'false'}
                className={`w-full min-h-[44px] bg-white border rounded-lg px-4 py-2.5 text-slate-900 text-base focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-rose-500 focus:ring-rose-400'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-400'
                }`}
              />
              <p id="reg-name-desc" className="text-xs text-slate-600">
                Enter your full legal or preferred name. You can also spell letter-by-letter with the voice assistant.
              </p>
              {errors.fullName && (
                <p id="reg-name-error" role="alert" className="text-sm font-semibold text-rose-700">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-800">
                Email address <span className="text-orange-800 font-normal text-xs">(required)</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => fillField('email', e.target.value)}
                placeholder="e.g. name@example.com"
                aria-describedby={`reg-email-desc ${errors.email ? 'reg-email-error' : ''}`}
                aria-invalid={errors.email ? 'true' : 'false'}
                className={`w-full min-h-[44px] bg-white border rounded-lg px-4 py-2.5 text-slate-900 text-base focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-500 focus:ring-rose-400'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-400'
                }`}
              />
              <p id="reg-email-desc" className="text-xs text-slate-600">
                Enter an email like name@example.com. Used for sign-in with a one-time code.
              </p>
              {errors.email && (
                <p id="reg-email-error" role="alert" className="text-sm font-semibold text-rose-700">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-2">
              <label htmlFor="reg-phone" className="block text-sm font-semibold text-slate-800">
                Phone number <span className="text-slate-600 font-normal text-xs">(optional)</span>
              </label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => fillField('phone', e.target.value)}
                placeholder="e.g. +251 91 123 4567"
                aria-describedby="reg-phone-desc"
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-base focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400"
              />
              <p id="reg-phone-desc" className="text-xs text-slate-600">
                Optional. Used for SMS notifications and human helper phone support.
              </p>
            </div>
          </fieldset>

          {/* Fieldset 2: Language Preference (Rule 23: At most 5 options) */}
          <fieldset className="space-y-4">
            <legend className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 w-full">
              Language Preference
            </legend>

            <div className="space-y-2">
              <label htmlFor="reg-lang" className="block text-sm font-semibold text-slate-800">
                Preferred language <span className="text-orange-800 font-normal text-xs">(required)</span>
              </label>
              <select
                id="reg-lang"
                name="preferredLanguage"
                autoComplete="language"
                required
                value={formData.preferredLanguage}
                onChange={(e) => fillField('preferredLanguage', e.target.value)}
                aria-describedby={`reg-lang-desc ${errors.preferredLanguage ? 'reg-lang-error' : ''}`}
                aria-invalid={errors.preferredLanguage ? 'true' : 'false'}
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-base focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400"
              >
                <option value="en">English (Default)</option>
                <option value="am">Amharic (አማርኛ)</option>
                <option value="om">Afaan Oromoo</option>
                <option value="ti">Tigrinya (ትግርኛ)</option>
                <option value="so">Somali (Soomaali)</option>
              </select>
              <p id="reg-lang-desc" className="text-xs text-slate-600">
                Choose the language for audio lessons, quiz questions, and assistant guidance.
              </p>
              {errors.preferredLanguage && (
                <p id="reg-lang-error" role="alert" className="text-sm font-semibold text-rose-700">
                  {errors.preferredLanguage}
                </p>
              )}
            </div>
          </fieldset>

          {/* Fieldset 3: Plain-Language Privacy Notice & Consent (F0 Rule 15, 23) */}
          <fieldset className="space-y-4">
            <legend className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 w-full">
              Privacy and Consent
            </legend>

            {/* Plain-Language Privacy Summary */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Shield className="w-5 h-5 text-orange-600 shrink-0" aria-hidden="true" />
                <span>Plain-Language Privacy Summary</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                We collect your name, email, phone number, and preferred language only to create your account, deliver lessons, and provide help. We never sell your personal information or share it with third parties to train AI models.
              </p>
            </div>

            {/* Consent Checkbox */}
            <div className="space-y-2 pt-2">
              <label
                htmlFor="reg-consent"
                className="flex items-start gap-3.5 cursor-pointer min-h-[44px] p-2 rounded-lg hover:bg-slate-50"
              >
                <input
                  id="reg-consent"
                  name="consent"
                  type="checkbox"
                  required
                  checked={formData.consent}
                  onChange={(e) => fillField('consent', e.target.checked)}
                  aria-describedby={`reg-consent-desc ${errors.consent ? 'reg-consent-error' : ''}`}
                  aria-invalid={errors.consent ? 'true' : 'false'}
                  className="mt-1 w-5 h-5 rounded text-[#0B132B] accent-orange-600 focus:ring-orange-500 bg-white border-slate-300"
                />
                <span className="text-sm text-slate-900 leading-normal">
                  I agree to the privacy terms and consent to creating my account.{' '}
                  <span className="text-orange-800 font-normal text-xs">(required)</span>
                </span>
              </label>
              <p id="reg-consent-desc" className="text-xs text-slate-600 pl-9">
                You must give your consent to register. The assistant will ask for an explicit yes before recording consent.
              </p>
              {errors.consent && (
                <p id="reg-consent-error" role="alert" className="text-sm font-semibold text-rose-700 pl-9">
                  {errors.consent}
                </p>
              )}
            </div>
          </fieldset>

          {/* Submit Action: Navy blue button with bold Orange text */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="w-full min-h-[48px] bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer text-base"
            >
              <span>Continue to Verification</span>
              <ArrowRight className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* STAGE 2: One-Time Code Sign-In Verification (F0 Rule 17: No CAPTCHA, accepts paste, autocomplete="one-time-code") */}
      {stage === 'verification' && (
        <form
          onSubmit={handleVerificationSubmit}
          noValidate
          className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <fieldset className="space-y-6">
            <legend className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 w-full">
              Enter One-Time Code
            </legend>

            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 text-sm text-slate-800 space-y-1">
              <p>
                We sent a 6-digit one-time code to <strong className="text-slate-900">{formData.email}</strong>.
              </p>
              <p className="text-xs text-orange-700 font-medium">
                No passwords or CAPTCHAs needed. You can paste the code directly. (Demo code: 123456)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-otp" className="block text-sm font-semibold text-slate-800">
                One-time code <span className="text-orange-800 font-normal text-xs">(required)</span>
              </label>
              <input
                ref={oneTimeCodeInputRef}
                id="reg-otp"
                name="oneTimeCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={formData.oneTimeCode}
                onChange={(e) => fillField('oneTimeCode', e.target.value)}
                placeholder="e.g. 123456"
                aria-describedby={`reg-otp-desc ${errors.oneTimeCode ? 'reg-otp-error' : ''}`}
                aria-invalid={errors.oneTimeCode ? 'true' : 'false'}
                className={`w-full min-h-[44px] bg-white border rounded-lg px-4 py-3 text-slate-900 text-lg tracking-widest font-mono focus:outline-none focus:ring-2 ${
                  errors.oneTimeCode
                    ? 'border-rose-500 focus:ring-rose-400'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-400'
                }`}
              />
              <p id="reg-otp-desc" className="text-xs text-slate-600">
                Enter or paste the 6-digit one-time code sent to your email or phone.
              </p>
              {errors.oneTimeCode && (
                <p id="reg-otp-error" role="alert" className="text-sm font-semibold text-rose-700">
                  {errors.oneTimeCode}
                </p>
              )}
            </div>
          </fieldset>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStage('details');
                setAssistantStep('ask_email');
              }}
              className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              Back to details
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold py-3 px-6 rounded-lg text-sm flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer"
            >
              <span>Verify & Complete Sign-In</span>
              <CheckCircle2 className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* STAGE 3: Success Banner (Requirement: "Account created. Going to course choice") */}
      {stage === 'success' && (
        <section
          role="status"
          aria-live="polite"
          className="bg-orange-50 border-2 border-orange-500 rounded-xl p-8 sm:p-12 text-center space-y-4 shadow-sm"
        >
          <CheckCircle2 className="w-16 h-16 text-orange-600 mx-auto animate-bounce" aria-hidden="true" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Account created!</h2>
          <p className="text-lg text-orange-800 font-semibold">
            Account created. Going to course choice...
          </p>
        </section>
      )}
    </div>
  );
}
