"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Volume2,
  VolumeX,
  CheckCircle2,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Globe,
  Tag,
  Scale,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useA11y } from "@/lib/a11y/a11y-context";
import { playEarcon } from "@/lib/audio/earcons";
import { speechPlayer } from "@/lib/speech/client/player";
import {
  getSpeechRecognitionConstructor,
  type RecognitionErrorEvent,
  type RecognitionLike,
  type RecognitionResultEvent,
} from "@/lib/speech/client/recognition";
import { useAssistant } from "@/lib/assistant/assistant-context";

export interface CourseItem {
  id: string;
  slug: string;
  title: string;
  titleAm: string;
  code: string;
  duration: string;
  durationAm: string;
  level: string;
  levelAm: string;
  price: string;
  priceNumeric: string;
  description: string;
  descriptionAm: string;
  syllabus: string[];
  audioMinutes: number;
  goals: string[];
}

const COURSES: CourseItem[] = [
  {
    id: "data-analytics",
    slug: "data-analytics",
    title: "Data Analytics",
    titleAm: "ዳታ አናሊቲክስ (Data Analytics)",
    code: "DA-100",
    duration: "14 Weeks (56 Hours)",
    durationAm: "14 ሳምንታት (56 ሰዓታት)",
    level: "Comprehensive",
    levelAm: "ሙሉ ፕሮግራም",
    price: "500 ETB",
    priceNumeric: "500",
    description:
      "Learn to transform data into high-value business decisions. Master SQL databases, Python analytics, Tableau dashboards, and accessible data interpretation.",
    descriptionAm:
      "ዳታን ወደ ውጤታማ የንግድ ውሳኔዎች መለወጥን ይማሩ። የSQL ዳታቤዝ፣ የፓይተን ዳታ ትንተና፣ ታብሎ እና ተደራሽ የዳታ አቀራረብን ያጠቃልላል።",
    syllabus: [
      "SQL & Relational Databases",
      "Python Data Analysis",
      "Tableau Dashboards",
      "Predictive Modeling",
    ],
    audioMinutes: 180,
    goals: [
      "data",
      "analytics",
      "python",
      "sql",
      "numbers",
      "math",
      "business",
      "insights",
      "charts",
      "analysis",
      "ዳታ",
    ],
  },
  {
    id: "wr-100",
    slug: "wr-100",
    title: "Fundamentals of Effective Communication",
    titleAm: "የሥራ ቦታ ተግባቦት (Effective Communication)",
    code: "WR-100",
    duration: "10 Weeks (40 Hours)",
    durationAm: "10 ሳምንታት (40 ሰዓታት)",
    level: "Foundational",
    levelAm: "መሰረታዊ",
    price: "Free",
    priceNumeric: "0",
    description:
      "Master professional communication: written reports, email etiquette, executive presentation, and inclusive collaboration designed for remote workplace success.",
    descriptionAm: "ሙያዊ የስራ ቦታ ተግባቦትን፣ ሪፖርት አጻጻፍን፣ የኢሜይል ስርዓትን፣ አቀራረብን እና አካታች የቡድን ስራን ይማሩ።",
    syllabus: ["Business Writing", "Verbal Persuasion", "Active Listening", "Conflict Resolution"],
    audioMinutes: 140,
    goals: [
      "communication",
      "writing",
      "presentation",
      "speaking",
      "emails",
      "interviews",
      "collaboration",
      "english",
      "ተግባቦት",
    ],
  },
  {
    id: "va-1",
    slug: "va-1",
    title: "Virtual Assistant Foundations",
    titleAm: "ቨርቹዋል አሲስታንት (Virtual Assistant)",
    code: "VA-101",
    duration: "8 Weeks (32 Hours)",
    durationAm: "8 ሳምንታት (32 ሰዓታት)",
    level: "Practical",
    levelAm: "ተግባራዊ",
    price: "500 ETB",
    priceNumeric: "500",
    description:
      "Master executive virtual operations: calendar scheduling, inbox triage, document preparation, and customer coordination using accessible cloud tools.",
    descriptionAm: "የርቀት ስራ የቢሮ ረዳትነት ስራዎችን፣ የቀን መቁጠሪያ ማስተካከልን፣ የኢሜይል አያያዝን እና የደንበኞች ድጋፍን ይማሩ።",
    syllabus: [
      "Calendar & Scheduling",
      "Email Management",
      "Google Workspace",
      "Customer Support Operations",
    ],
    audioMinutes: 120,
    goals: [
      "virtual assistant",
      "assistant",
      "remote",
      "admin",
      "office",
      "calendar",
      "email",
      "coordination",
      "ቨርቹዋል",
    ],
  },
  {
    id: "accessibility-mastery",
    slug: "accessibility-mastery",
    title: "Digital Accessibility & Assistive Tech Mastery",
    titleAm: "አስስቲቭ ቴክኖሎጂ (Assistive Tech Mastery)",
    code: "A11Y-50",
    duration: "4 Weeks (16 Hours)",
    durationAm: "4 ሳምንታት (16 ሰዓታት)",
    level: "Specialized",
    levelAm: "ልዩ ስልጠና",
    price: "Free",
    priceNumeric: "0",
    description:
      "Master screen readers (NVDA, JAWS, TalkBack), keyboard navigation, document auditing, and accessible digital productivity for independent study and office work.",
    descriptionAm:
      "የስክሪን ሪደር ሶፍትዌሮችን (NVDA, JAWS, TalkBack)፣ የኪቦርድ አጠቃቀምን እና ተደራሽ የዲጂታል ምርታማነት ክህሎቶችን ይማሩ።",
    syllabus: [
      "Screen Reader Hotkeys",
      "Accessible Document Creation",
      "Web Navigation Mastery",
      "Productivity Workflows",
    ],
    audioMinutes: 90,
    goals: [
      "screen reader",
      "accessibility",
      "assistive tech",
      "nvda",
      "jaws",
      "talkback",
      "blind",
      "low vision",
      "አስስቲቭ",
    ],
  },
];

export default function CoursesPage() {
  const router = useRouter();
  const { announce, mode, preferences, language, toggleLanguage } = useA11y();
  const { registerAction, unregisterAction } = useAssistant();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const isAmharic = language === "am-ET";

  // Filters & Search
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Course Confirmation Dialog State
  const [confirmingCourse, setConfirmingCourse] = useState<CourseItem | null>(null);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  // Standalone "Read All Courses" State (works without assistant)
  const [isReadingAll, setIsReadingAll] = useState<boolean>(false);

  // Assistant State
  const [assistantActive, setAssistantActive] = useState<boolean>(false);
  const [assistantSpokenText, setAssistantSpokenText] = useState<string>("");
  const [voiceInputText, setVoiceInputText] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const isSpeakingRef = useRef<boolean>(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const assistantActiveRef = useRef(assistantActive);
  useEffect(() => {
    assistantActiveRef.current = assistantActive;
  }, [assistantActive]);

  const startListeningRef = useRef<() => void>(() => {});

  // Speak assistant message slowly with safety timeout (F0 Rule 20)
  const speakAssistant = useCallback(
    (text: string) => {
      isSpeakingRef.current = true;
      setAssistantSpokenText(text);
      announce(text, "polite");

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

      if (
        mode === "voice-first" &&
        !preferences.suppressInAppTTS &&
        typeof window !== "undefined"
      ) {
        // Server speech (Gemini): a real Amharic voice. Falls back to the browser voice by itself.
        speechPlayer.cancel();
        let finished = false;

        const finishSpeaking = () => {
          if (finished) return;
          finished = true;
          if (speechSafetyTimerRef.current) {
            clearTimeout(speechSafetyTimerRef.current);
            speechSafetyTimerRef.current = null;
          }
          isSpeakingRef.current = false;
          activeUtteranceRef.current = null;
          setTimeout(() => {
            if (assistantActiveRef.current) {
              startListeningRef.current();
            }
          }, 350);
        };

        // Safety timer: server speech can take a few seconds to start, so allow for that.
        const words = text.split(/\s+/).length;
        const duration = Math.max(3500, (words / (0.8 * 2.3)) * 1000 + 1500) + 20000;
        speechSafetyTimerRef.current = setTimeout(finishSpeaking, duration);

        void speechPlayer
          .speak(text, { lang: language === "am-ET" ? "am-ET" : "en-US", rate: 0.8 })
          .then(finishSpeaking);
      } else {
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (assistantActiveRef.current) {
            startListeningRef.current();
          }
        }, 1200);
      }
    },
    [announce, language, mode, preferences.suppressInAppTTS],
  );

  // Set page title and move focus to h1 (F0 Rule 4, 7)
  useEffect(() => {
    document.title = isAmharic ? "ኮርስ ይምረጡ - Ableway" : "Choose a course - Ableway";
    const welcome = isAmharic
      ? "ኮርስ መምረጫ ገጽ ተከፍቷል። 4 የሚገኙ ኮርሶች አሉ። በኪቦርድዎ ወይም በድምጽ ረዳቱ መምረጥ ይችላሉ።"
      : "Choose a course page loaded. There are 4 available courses to choose from. You can use your keyboard or the spoken assistant.";
    announce(welcome, "polite");
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [announce, isAmharic]);

  // Open confirmation dialog when course is chosen (F0 Rule 8)
  const handleOpenConfirmDialog = useCallback(
    (course: CourseItem) => {
      setConfirmingCourse(course);
      setEnrollmentError(null);
      playEarcon("success");

      const titleToSay = isAmharic ? course.titleAm : course.title;
      const promptMsg = isAmharic
        ? `«${titleToSay}»ን መርጠዋል። ዋጋው ${course.price} ነው። ወደ ክፍያ መቀጠል ይፈልጋሉ?`
        : `You chose ${course.title}. The price is ${course.price}. Continue to payment?`;

      announce(promptMsg, "polite");
      if (assistantActiveRef.current) {
        speakAssistant(promptMsg);
      }
    },
    [announce, isAmharic, speakAssistant],
  );

  // Close confirmation dialog
  const handleCancelConfirmDialog = useCallback(() => {
    if (confirmingCourse) {
      const cancelMsg = isAmharic
        ? `የኮርስ ምርጫ ተሰርዟል። ሌላ ኮርስ መምረጥ ይችላሉ።`
        : `Course selection cancelled. You can choose another course.`;
      announce(cancelMsg, "polite");
      if (assistantActiveRef.current) {
        speakAssistant(cancelMsg);
      }
    }
    setConfirmingCourse(null);
    setEnrollmentError(null);
    setIsEnrolling(false);
  }, [announce, confirmingCourse, isAmharic, speakAssistant]);

  // Register global assistant action for selecting course
  useEffect(() => {
    registerAction({
      name: "selectCourse",
      description: "Enroll in a course by title or id",
      requiresConfirmation: true,
      confirmationPrompt: (params) => {
        const title = (params.title as string) || "Data Analytics";
        return `Are you sure you want to enroll in ${title}? This will register your enrollment and proceed to your learning dashboard.`;
      },
      announcement: (params) => `Enrolling in ${(params.title as string) || "course"}.`,
      handler: (params) => {
        const courseId = (params.courseId as string) || "data-analytics";
        const course = COURSES.find((c) => c.id === courseId || c.slug === courseId) || COURSES[0];
        handleOpenConfirmDialog(course);
      },
    });

    return () => {
      unregisterAction("selectCourse");
    };
  }, [registerAction, unregisterAction, handleOpenConfirmDialog]);

  // Confirm enrollment: call POST /api/enrollments and go to /payment
  const handleConfirmEnrollment = useCallback(async () => {
    if (!confirmingCourse) return;

    setIsEnrolling(true);
    setEnrollmentError(null);

    const pendingMsg = isAmharic
      ? `ምዝገባዎን በማረጋገጥ ላይ... እባክዎ ይጠብቁ።`
      : `Confirming your enrollment for ${confirmingCourse.title}... Please wait.`;
    announce(pendingMsg, "polite");

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: confirmingCourse.id,
          courseTitle: confirmingCourse.title,
          price: confirmingCourse.price,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || "We could not process your enrollment right now. Please try again.",
        );
      }

      playEarcon("success");
      const successMsg = isAmharic
        ? `ምዝገባዎ ተረጋግጧል። ወደ ክፍያ ገጽ እየተላለፉ ነው።`
        : `Enrollment confirmed. Going to payment.`;
      announce(successMsg, "polite");

      // Navigate to /payment with course parameters
      router.push(
        `/payment?courseId=${confirmingCourse.id}&title=${encodeURIComponent(
          confirmingCourse.title,
        )}&price=${encodeURIComponent(confirmingCourse.priceNumeric || confirmingCourse.price)}`,
      );
    } catch (err) {
      playEarcon("error");
      const errorMsg =
        (err instanceof Error && err.message) ||
        (isAmharic
          ? "ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ የበይነመረብ ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።"
          : "We could not complete your enrollment right now. Please check your connection and try again.");
      setEnrollmentError(errorMsg);
      announce(errorMsg, "assertive");
      setIsEnrolling(false);
    }
  }, [announce, confirmingCourse, isAmharic, router]);

  // "Read all courses" button logic (works independently without assistant)
  const handleReadAllCourses = useCallback(() => {
    if (isReadingAll) {
      if (typeof window !== "undefined") {
        speechPlayer.cancel();
      }
      setIsReadingAll(false);
      const stoppedMsg = isAmharic ? "የኮርሶችን ዝርዝር ማንበብ ቆሟል።" : "Stopped reading all courses.";
      announce(stoppedMsg, "polite");
      return;
    }

    setIsReadingAll(true);

    const fullScript = isAmharic
      ? `በአጠቃላይ 4 የሚገኙ ኮርሶች አሉ። ` +
        COURSES.map(
          (c, idx) =>
            `ኮርስ ${idx + 1}፦ ${c.titleAm}። ደረጃው፦ ${c.levelAm}። የጊዜ ርዝማኔው፦ ${c.durationAm}። ዋጋው፦ ${c.price}። ማብራሪያ፦ ${c.descriptionAm}።`,
        ).join(" ")
      : `There are 4 courses available to choose from. ` +
        COURSES.map(
          (c, idx) =>
            `Course ${idx + 1}: ${c.title}. Level: ${c.level}. Duration: ${c.duration}. Price: ${c.price}. Description: ${c.description}.`,
        ).join(" ");

    announce(fullScript, "polite");

    if (typeof window !== "undefined") {
      speechPlayer.cancel();
      void speechPlayer
        .speak(fullScript, { lang: isAmharic ? "am-ET" : "en-US", rate: 0.8 })
        .then(() => setIsReadingAll(false))
        .catch(() => setIsReadingAll(false));
    }
  }, [announce, isAmharic, isReadingAll]);

  // Read single course details aloud
  const handleReadDetails = useCallback(
    (course: CourseItem) => {
      const text = isAmharic
        ? `${course.titleAm}። ደረጃ፦ ${course.levelAm}። የጊዜ ርዝማኔ፦ ${course.durationAm}። ዋጋ፦ ${course.price}። ${course.descriptionAm}`
        : `${course.title}. Level: ${course.level}. Duration: ${course.duration}. Price: ${course.price}. ${course.description} Skills included: ${course.syllabus.join(", ")}.`;

      announce(text, "polite");
      if (typeof window !== "undefined") {
        speechPlayer.cancel();
        void speechPlayer.speak(text, { lang: isAmharic ? "am-ET" : "en-US", rate: 0.8 });
      }
    },
    [announce, isAmharic],
  );

  // Spoken voice command handler: course count, read, compare, recommend from goals
  const handleVoiceCommand = useCallback(
    (rawInput: string) => {
      const input = rawInput.trim();
      if (!input) return;
      const lower = input.toLowerCase();

      // In-dialog voice confirmation
      if (confirmingCourse) {
        if (
          lower.includes("yes") ||
          lower.includes("continue") ||
          lower.includes("confirm") ||
          lower.includes("proceed") ||
          lower.includes("pay") ||
          lower.includes("አዎ") ||
          lower.includes("ቀጥል") ||
          lower.includes("እሺ")
        ) {
          handleConfirmEnrollment();
          return;
        }
        if (
          lower.includes("no") ||
          lower.includes("cancel") ||
          lower.includes("back") ||
          lower.includes("stop") ||
          lower.includes("አይ") ||
          lower.includes("ተመለስ") ||
          lower.includes("ይቅር")
        ) {
          handleCancelConfirmDialog();
          return;
        }
      }

      // 1. Assistant says how many courses there are
      if (
        lower.includes("how many") ||
        lower.includes("count") ||
        lower.includes("number of courses") ||
        lower.includes("how much courses") ||
        lower.includes("ስንት ኮርስ") ||
        lower.includes("ስንት ናቸው")
      ) {
        const msg = isAmharic
          ? `በአጠቃላይ 4 የሚገኙ ኮርሶች አሉ፦ ዳታ አናሊቲክስ፣ የሥራ ቦታ ተግባቦት፣ ቨርቹዋል አሲስታንት እና አስስቲቭ ቴክኖሎጂ።`
          : `There are 4 courses available to choose from: Data Analytics, Fundamentals of Effective Communication, Virtual Assistant Foundations, and Digital Accessibility & Assistive Tech Mastery.`;
        speakAssistant(msg);
        return;
      }

      // 2. Assistant reads them on request
      if (
        lower.includes("read courses") ||
        lower.includes("read all") ||
        lower.includes("list courses") ||
        lower.includes("tell me courses") ||
        lower.includes("what courses") ||
        lower.includes("ኮርሶችን አንብብ") ||
        lower.includes("ዘርዝር") ||
        lower.includes("ንገረኝ")
      ) {
        const msg = isAmharic
          ? `አራቱ ኮርሶች የሚከተሉት ናቸው፦ 1፦ ዳታ አናሊቲክስ፣ 14 ሳምንታት፣ ዋጋው 500 ብር። 2፦ የሥራ ቦታ ተግባቦት፣ 10 ሳምንታት፣ ነጻ። 3፦ ቨርቹዋል አሲስታንት፣ 8 ሳምንታት፣ ዋጋው 500 ብር። 4፦ አስስቲቭ ቴክኖሎጂ፣ 4 ሳምንታት፣ ነጻ። የትኛውን መምረጥ ይፈልጋሉ?`
          : `Here are the 4 courses: 1: Data Analytics, 14 weeks, price 500 ETB. 2: Fundamentals of Effective Communication, 10 weeks, price Free. 3: Virtual Assistant Foundations, 8 weeks, price 500 ETB. 4: Digital Accessibility & Assistive Tech Mastery, 4 weeks, price Free. Which one would you like to choose?`;
        speakAssistant(msg);
        return;
      }

      // 3. Assistant compares two courses
      if (
        lower.includes("compare") ||
        lower.includes("difference") ||
        lower.includes("versus") ||
        lower.includes("vs") ||
        lower.includes("አወዳድር") ||
        lower.includes("ልዩነት")
      ) {
        const msg = isAmharic
          ? `ዳታ አናሊቲክስ እና ተግባቦትን ስናወዳድር፦ ዳታ አናሊቲክስ የ14 ሳምንታት የፓይተን እና SQL ትንተና ስልጠና ሲሆን ዋጋው 500 ብር ነው። የሥራ ቦታ ተግባቦት ደግሞ የ10 ሳምንታት የመጻፍ፣ የመናገር እና የአቀራረብ ክህሎት ስልጠና ሲሆን በነጻ የሚሰጥ ነው። የትኛውን መምረጥ ይፈልጋሉ?`
          : `Comparing Data Analytics and Fundamentals of Effective Communication: Data Analytics is a 14-week comprehensive course focusing on Python, SQL databases, and business insights, priced at 500 ETB. Fundamentals of Effective Communication is a 10-week foundational course focusing on executive writing, presentation, and workplace confidence, and it is completely free. Which one fits your goals?`;
        speakAssistant(msg);
        return;
      }

      // 4. Assistant recommends one from learner's goals
      if (
        lower.includes("recommend") ||
        lower.includes("goal") ||
        lower.includes("suggest") ||
        lower.includes("which should i") ||
        lower.includes("which course") ||
        lower.includes("best for me") ||
        lower.includes("ምከረኝ") ||
        lower.includes("የቱ ይሻላል") ||
        lower.includes("ግብ")
      ) {
        if (
          lower.includes("data") ||
          lower.includes("number") ||
          lower.includes("math") ||
          lower.includes("python") ||
          lower.includes("sql") ||
          lower.includes("analysis") ||
          lower.includes("ዳታ")
        ) {
          const msg = isAmharic
            ? `ከዳታ እና ከቁጥሮች ጋር ለመስራት ላቀዱት ግብ፦ ዳታ አናሊቲክስን እመክርዎታለሁ። 14 ሳምንታት ሲሆን ዋጋው 500 ብር ነው። ዳታ አናሊቲክስን መምረጥ ይፈልጋሉ?`
            : `Based on your goal to work with data, numbers, and business insights, I recommend Data Analytics. It is a 14-week comprehensive course priced at 500 ETB. Would you like to choose Data Analytics?`;
          speakAssistant(msg);
          return;
        }

        if (
          lower.includes("writing") ||
          lower.includes("speak") ||
          lower.includes("communication") ||
          lower.includes("english") ||
          lower.includes("presentation") ||
          lower.includes("interview") ||
          lower.includes("ተግባቦት") ||
          lower.includes("መናገር")
        ) {
          const msg = isAmharic
            ? `የአቀራረብ እና የስራ ቦታ ግንኙነትን ለማሻሻል ላቀዱት ግብ፦ የሥራ ቦታ ተግባቦትን እመክርዎታለሁ። 10 ሳምንታት ሲሆን በነጻ የሚሰጥ ነው። ተግባቦትን መምረጥ ይፈልጋሉ?`
            : `Based on your goal to master verbal delivery, executive writing, and workplace confidence, I recommend Fundamentals of Effective Communication. It is 10 weeks and free. Would you like to choose Communication?`;
          speakAssistant(msg);
          return;
        }

        if (
          lower.includes("remote") ||
          lower.includes("assistant") ||
          lower.includes("admin") ||
          lower.includes("office") ||
          lower.includes("schedule") ||
          lower.includes("email") ||
          lower.includes("ቨርቹዋል") ||
          lower.includes("ረዳት")
        ) {
          const msg = isAmharic
            ? `የርቀት ቢሮ ስራዎችን እና አስተዳደራዊ ተግባራትን ለማከናወን ላቀዱት ግብ፦ ቨርቹዋል አሲስታንትን እመክርዎታለሁ። 8 ሳምንታት ሲሆን ዋጋው 500 ብር ነው። ቨርቹዋል አሲስታንትን መምረጥ ይፈልጋሉ?`
            : `Based on your goal for remote office work, calendar scheduling, and executive coordination, I recommend Virtual Assistant Foundations. It is 8 weeks priced at 500 ETB. Would you like to choose Virtual Assistant?`;
          speakAssistant(msg);
          return;
        }

        if (
          lower.includes("screen reader") ||
          lower.includes("blind") ||
          lower.includes("low vision") ||
          lower.includes("assistive") ||
          lower.includes("nvda") ||
          lower.includes("jaws") ||
          lower.includes("talkback") ||
          lower.includes("አስስቲቭ") ||
          lower.includes("ስክሪን ሪደር")
        ) {
          const msg = isAmharic
            ? `ስክሪን ሪደርን እና የኮምፒውተር ተደራሽነትን ለመማር ላቀዱት ግብ፦ አስስቲቭ ቴክኖሎጂን እመክርዎታለሁ። 4 ሳምንታት ሲሆን በነጻ የሚሰጥ ነው። አስስቲቭ ቴክኖሎጂን መምረጥ ይፈልጋሉ?`
            : `Based on your goal to master assistive technology and screen readers, I recommend Digital Accessibility & Assistive Tech Mastery. It is 4 weeks and free. Would you like to choose Assistive Tech?`;
          speakAssistant(msg);
          return;
        }

        const defaultRec = isAmharic
          ? `የቴክኖሎጂ እና የዳታ ሙያ ከፈለጉ ዳታ አናሊቲክስን፣ አጠቃላይ የሥራ ቦታ ተግባቦት ክህሎት ከፈለጉ ደግሞ ተግባቦት ኮርስን እመክራለሁ። የትኛው የበለጠ ይስብዎታል?`
          : `If you want a high-paying analytical tech skill, I recommend Data Analytics. If you want essential communication and presentation skills, I recommend Fundamentals of Effective Communication. Which direction sounds best to you?`;
        speakAssistant(defaultRec);
        return;
      }

      // Course selection by voice
      if (
        lower.includes("data") ||
        lower.includes("analytics") ||
        lower.includes("python") ||
        lower.includes("sql") ||
        lower.includes("first") ||
        lower.includes("ዳታ") ||
        lower.includes("አናሊቲክስ") ||
        lower.includes("አንድ") ||
        lower === "1" ||
        lower.includes("የመጀመሪያ")
      ) {
        handleOpenConfirmDialog(COURSES[0]);
        return;
      }

      if (
        lower.includes("communication") ||
        lower.includes("writing") ||
        lower.includes("wr") ||
        lower.includes("second") ||
        lower.includes("ተግባቦት") ||
        lower.includes("ኮሚዩኒኬሽን") ||
        lower.includes("ሁለት") ||
        lower === "2" ||
        lower.includes("ሁለተኛ")
      ) {
        handleOpenConfirmDialog(COURSES[1]);
        return;
      }

      if (
        lower.includes("virtual assistant") ||
        lower.includes("assistant") ||
        lower.includes("va") ||
        lower.includes("third") ||
        lower.includes("ቨርቹዋል") ||
        lower.includes("ረዳት") ||
        lower.includes("ሶስት") ||
        lower.includes("ሦስት") ||
        lower === "3" ||
        lower.includes("ሦስተኛ")
      ) {
        handleOpenConfirmDialog(COURSES[2]);
        return;
      }

      if (
        lower.includes("assistive") ||
        lower.includes("accessibility") ||
        lower.includes("screen reader") ||
        lower.includes("fourth") ||
        lower.includes("አስስቲቭ") ||
        lower.includes("ስክሪን ሪደር") ||
        lower.includes("አራት") ||
        lower === "4" ||
        lower.includes("አራተኛ")
      ) {
        handleOpenConfirmDialog(COURSES[3]);
        return;
      }

      const fallback = isAmharic
        ? `«${input}» ተሰምቷል። «ዳታ አናሊቲክስ ምረጥ»፣ «ተግባቦት ምረጥ»፣ «አወዳድር» ወይም «ምከረኝ» ማለት ይችላሉ።`
        : `I heard ${input}. You can say select Data Analytics, say compare, say recommend, or say read all courses.`;
      speakAssistant(fallback);
    },
    [
      confirmingCourse,
      handleCancelConfirmDialog,
      handleConfirmEnrollment,
      handleOpenConfirmDialog,
      isAmharic,
      speakAssistant,
    ],
  );

  // Hands-free Speech Recognition
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isSpeakingRef.current) return;

    const SpeechRec =
      // Server recognition (Gemini): English and Amharic in every browser, browser recognition as fallback.
      getSpeechRecognitionConstructor();

    if (!SpeechRec) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const rec = new SpeechRec();
      rec.lang = isAmharic ? "am-ET" : "en-US";
      rec.interimResults = true;
      rec.continuous = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (evt: RecognitionResultEvent) => {
        if (isSpeakingRef.current) return;

        let interim = "";
        let final = "";

        for (let i = evt.resultIndex; i < evt.results.length; ++i) {
          const res = evt.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        if (interim.trim()) {
          setVoiceInputText(interim.trim());
        }

        if (final.trim()) {
          const trimmed = final.trim();
          setVoiceInputText(trimmed);
          handleVoiceCommand(trimmed);
        }
      };

      rec.onerror = (e: RecognitionErrorEvent) => {
        if (e.error === "not-allowed") {
          announce(
            isAmharic
              ? "የማይክራፎን ፈቃድ አልተሰጠም። በኪቦርድዎ ወይም በስክሪኑ ላይ ያለውን ቁልፍ በመጠቀም መምረጥ ይችላሉ።"
              : "Microphone permission not granted. You can use your keyboard to choose any course.",
            "assertive",
          );
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (!isSpeakingRef.current && assistantActiveRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && assistantActiveRef.current) {
              try {
                rec.start();
              } catch {}
            }
          }, 350);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {}
  }, [handleVoiceCommand, announce, isAmharic]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Global helper for simulated voice testing
  useEffect(() => {
    window.__simulateVoiceInput = (text: string) => {
      setVoiceInputText(text);
      handleVoiceCommand(text);
    };
  }, [handleVoiceCommand]);

  // Start Assistant on Button Click
  const startAssistant = useCallback(() => {
    isSpeakingRef.current = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechPlayer.cancel();
    }
    playEarcon("listening");
    setAssistantActive(true);
    const intro = isAmharic
      ? "እንኳን ወደ ኮርስ መምረጫ በደህና መጡ። በአጠቃላይ 4 የሚገኙ ኮርሶች አሉ፦ 1: ዳታ አናሊቲክስ፤ 2: የሥራ ቦታ ተግባቦት፤ 3: ቨርቹዋል አሲስታንት፤ 4: አስስቲቭ ቴክኖሎጂ። የኮርሱን ስም መናገር፣ እንዲያወዳድርልዎ መጠየቅ፣ ወይም የሙያ ግብዎን በመናገር ምክር መጠየቅ ይችላሉ።"
      : "Welcome to course choice. There are 4 courses available to choose from: 1: Data Analytics, 2: Fundamentals of Effective Communication, 3: Virtual Assistant Foundations, and 4: Digital Accessibility & Assistive Tech Mastery. Say the name of a course, say compare to hear differences, or tell me your career goals for a recommendation.";
    speakAssistant(intro);
  }, [speakAssistant, isAmharic]);

  // Toggle mic listening
  const toggleListening = () => {
    isSpeakingRef.current = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechPlayer.cancel();
    }
    if (isListening) {
      try {
        recognitionRef.current?.abort();
      } catch {}
      setIsListening(false);
      playEarcon("stop");
      announce(isAmharic ? "ማይክራፎን ቆሟል።" : "Microphone paused.", "polite");
    } else {
      playEarcon("listening");
      startListening();
      announce(
        isAmharic
          ? "ማይክራፎን ተከፍቷል። የእርስዎን ትዕዛዝ በማዳመጥ ላይ..."
          : "Microphone active. Listening for your course choice.",
        "polite",
      );
    }
  };

  // Filter courses based on level and search
  const filteredCourses = COURSES.filter((c) => {
    const matchesLevel =
      filterLevel === "all"
        ? true
        : filterLevel === "comprehensive"
          ? c.level === "Comprehensive"
          : filterLevel === "foundational"
            ? c.level === "Foundational"
            : filterLevel === "practical"
              ? c.level === "Practical"
              : filterLevel === "specialized"
                ? c.level === "Specialized"
                : true;

    const matchesSearch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.goals.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesLevel && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 bg-white text-slate-900 min-h-screen">
      {/* Page Header (F0 Rule 2, 7: Single h1 with focus) */}
      <header className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1
            ref={h1Ref}
            tabIndex={-1}
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
          >
            {isAmharic ? "ኮርስ ይምረጡ" : "Choose a course"}
          </h1>

          {/* Top Actions: Read All Courses button & Language switch */}
          <div className="flex flex-wrap items-center gap-3">
            {/* "Read all courses" button (Works without assistant) */}
            <button
              type="button"
              onClick={handleReadAllCourses}
              id="read-all-courses-btn"
              className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm rounded-lg flex items-center justify-center gap-2 border-2 border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer transition-colors"
            >
              {isReadingAll ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-600" aria-hidden="true" />
                  <span>{isAmharic ? "ማንበብ አቁም" : "Stop reading"}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-slate-700" aria-hidden="true" />
                  <span>{isAmharic ? "ሁሉንም ኮርሶች አንብብ" : "Read all courses"}</span>
                </>
              )}
            </button>

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
              id="courses-lang-switch-btn"
              className="min-h-[44px] px-3.5 py-2 rounded-lg font-bold text-xs border border-orange-500/80 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
              <span>{isAmharic ? "ቋንቋ፡ አማርኛ" : "Language: English"}</span>
            </button>
          </div>
        </div>

        <p className="text-base text-slate-700 max-w-2xl leading-relaxed">
          {isAmharic
            ? "የድምጽ ትምህርቶችን እና ፈተናዎችን ለመጀመር ከታች ካሉት ፕሮግራሞች ይምረጡ። በኪቦርድዎ ወይም በድምጽ ረዳቱ አማካኝነት መምረጥ ይችላሉ።"
            : "Select a programme below to start your audio lessons and practice quizzes. You can navigate by keyboard or use the spoken assistant to choose hands-free."}
        </p>
      </header>

      {/* Global Error Banner (F0 Rule 16) */}
      {pageError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-2"
        >
          <div className="flex items-center gap-2 text-red-900 font-bold">
            <AlertCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
            <h2 className="text-base font-bold">
              {isAmharic ? "የተፈጠረ ችግር አለ" : "Something went wrong"}
            </h2>
          </div>
          <p className="text-sm text-red-800">{pageError}</p>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-xs font-bold text-red-900 underline hover:no-underline"
          >
            {isAmharic ? "ይህን መልእክት ዝጋ" : "Dismiss this message"}
          </button>
        </div>
      )}

      {/* Spoken Course Selection Assistant */}
      <section
        aria-label="Spoken Course Choice Assistant"
        className="bg-slate-50 border-2 border-[#0B132B] rounded-xl p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B132B] border border-orange-500/50 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
              <Volume2 className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {isAmharic ? "የድምጽ ኮርስ መምረጫ ረዳት" : "Spoken Course Assistant"}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#0B132B] text-orange-400 border border-orange-500/50">
                  {isAmharic ? "በአማርኛ ድምጽ ለመምረጥ ዝግጁ" : "Voice Selection Ready"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {assistantActive
                  ? isAmharic
                    ? "የድምጽ ረዳቱ በአማርኛ እየተናገረ እና የእርስዎን ምርጫ እያዳመጠ ነው።"
                    : "Speaking slowly and listening automatically for your course choice."
                  : isAmharic
                    ? "የድምጽ ረዳቱን በማስጀመር ኮርሶችን በአማርኛ ድምጽ ይምረጡ ወይም ያወዳድሩ።"
                    : "Start the assistant to hear course recommendations, count, compare, and select by voice."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {!assistantActive ? (
              <button
                type="button"
                onClick={startAssistant}
                id="start-courses-assistant-btn"
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-5 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold text-sm rounded-lg flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <span>{isAmharic ? "የድምጽ ረዳቱን ጀምር" : "Start Voice Assistant"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAssistantActive(false);
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                    } catch {}
                  }
                  setIsListening(false);
                  const pauseMsg = isAmharic
                    ? "የድምጽ ረዳቱ ቆሟል። በኪቦርድዎ ኮርስ መምረጥ ይችላሉ።"
                    : "Voice assistant paused. You can use your keyboard to select a course.";
                  announce(pauseMsg, "polite");
                }}
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-300 shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{isAmharic ? "ረዳቱን አቁም" : "Pause Assistant"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Assistant Actions (Compare, Goals, Count) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <span className="text-xs font-semibold text-slate-700">
            {isAmharic ? "ፈጣን ጥያቄዎች፦" : "Quick actions:"}
          </span>
          <button
            type="button"
            onClick={() => handleVoiceCommand("how many courses")}
            className="px-3 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-800 rounded-md border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {isAmharic ? "ስንት ኮርሶች አሉ?" : "How many courses?"}
          </button>
          <button
            type="button"
            onClick={() => handleVoiceCommand("compare")}
            className="px-3 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-800 rounded-md border border-slate-300 font-medium flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <Scale className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
            <span>{isAmharic ? "ኮርሶችን አወዳድር" : "Compare 2 courses"}</span>
          </button>
          <button
            type="button"
            onClick={() => handleVoiceCommand("recommend from my goal to work with data")}
            className="px-3 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-800 rounded-md border border-slate-300 font-medium flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
            <span>{isAmharic ? "ለዳታ ግብ ምክር" : "Recommend for Data goal"}</span>
          </button>
          <button
            type="button"
            onClick={() => handleVoiceCommand("recommend from my goal to improve speaking")}
            className="px-3 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-800 rounded-md border border-slate-300 font-medium flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
            <span>{isAmharic ? "ለተግባቦት ግብ ምክር" : "Recommend for Speaking goal"}</span>
          </button>
        </div>

        {/* Assistant Speech Feedback */}
        {assistantActive && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between min-h-[26px]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B132B] uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" aria-hidden="true" />
                <span>{isAmharic ? "ረዳቱ እንዲህ ይላል፦" : "Assistant says:"}</span>
              </div>
              <div className="h-6 flex items-center">
                {isListening ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                    {isAmharic ? "የኮርስ ምርጫዎን በማዳመጥ ላይ..." : "Listening for course choice..."}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {isAmharic ? "በዝግታ እየተናገረ ነው..." : "Speaking slowly..."}
                  </span>
                )}
              </div>
            </div>

            <p
              data-testid="courses-speech-display"
              className="text-base text-slate-900 font-medium leading-relaxed"
              aria-live="polite"
            >
              {assistantSpokenText ||
                (isAmharic
                  ? "«ዳታ አናሊቲክስ ምረጥ»፣ «ተግባቦት ምረጥ»፣ «1»፣ «አወዳድር» ወይም «ምከረኝ» ይበሉ..."
                  : 'Say "Select Data Analytics", "Compare", "Recommend", or "How many courses"...')}
            </p>

            {/* Spoken Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVoiceCommand(voiceInputText);
                setVoiceInputText("");
              }}
              className="pt-2 flex items-center gap-2"
              aria-label="Course selection voice input form"
            >
              <label htmlFor="course-voice-input" className="sr-only">
                Speak or type course choice
              </label>
              <input
                id="course-voice-input"
                type="text"
                value={voiceInputText}
                onChange={(e) => setVoiceInputText(e.target.value)}
                placeholder="Speak hands-free, or type e.g. 'Data Analytics', 'compare', 'recommend'..."
                className="flex-1 min-h-[44px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400"
              />

              <button
                type="button"
                onClick={toggleListening}
                className={`min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors border ${
                  isListening
                    ? "bg-rose-600 text-white border-rose-700"
                    : "bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 border-orange-500"
                }`}
                aria-label={isListening ? "Pause listening" : "Listen with microphone"}
                aria-pressed={isListening}
              >
                {isListening ? (
                  <Mic className="w-5 h-5 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 text-orange-400" />
                )}
              </button>

              <button
                type="submit"
                className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold rounded-lg text-sm flex items-center justify-center gap-1.5 border border-orange-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-4 h-4 text-orange-400" aria-hidden="true" />
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Course Cards Grid & Filter Section */}
      <section aria-labelledby="available-courses-title" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 id="available-courses-title" className="text-2xl font-bold text-slate-900">
            {isAmharic ? "የሚገኙ ፕሮግራሞች" : "Available Programmes"} ({filteredCourses.length})
          </h2>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter courses"
          >
            <button
              type="button"
              onClick={() => {
                setFilterLevel("all");
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                filterLevel === "all"
                  ? "bg-[#0B132B] text-orange-400 border border-orange-500"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAmharic ? "ሁሉም ኮርሶች" : "All Courses"}
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel("comprehensive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                filterLevel === "comprehensive"
                  ? "bg-[#0B132B] text-orange-400 border border-orange-500"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAmharic ? "ሙሉ ፕሮግራም" : "Comprehensive"}
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel("foundational")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                filterLevel === "foundational"
                  ? "bg-[#0B132B] text-orange-400 border border-orange-500"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAmharic ? "መሰረታዊ" : "Foundational"}
            </button>
          </div>
        </div>

        {/* Empty State in Plain Language (User Requirement) */}
        {filteredCourses.length === 0 ? (
          <section
            aria-labelledby="empty-courses-heading"
            className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 id="empty-courses-heading" className="text-xl font-bold text-slate-900">
              {isAmharic ? "ምንም ኮርስ አልተገኘም" : "No courses found"}
            </h2>
            <p className="text-sm text-slate-700 max-w-md mx-auto leading-relaxed">
              {isAmharic
                ? 'ከተመረጠው ማጣሪያ ጋር የሚስማማ ኮርስ የለም። ሁሉንም ኮርሶች ለማየት "ሁሉም ኮርሶች" የሚለውን ይምረጡ።'
                : 'No courses match your selected filter. Please select "All Courses" to see all 4 available programmes.'}
            </p>
            <button
              type="button"
              id="reset-filter-btn"
              onClick={() => {
                setFilterLevel("all");
                setSearchQuery("");
              }}
              className="min-h-[44px] px-5 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 font-bold rounded-lg text-sm border border-orange-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
            >
              {isAmharic ? "ሁሉንም ኮርሶች አሳይ" : "Show all courses"}
            </button>
          </section>
        ) : (
          /* Real List of Cards: native ul and li (F0 Rule 24) */
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0 m-0">
            {filteredCourses.map((course) => (
              <li key={course.id} className="flex">
                <article
                  className={`w-full bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 ${
                    confirmingCourse?.id === course.id
                      ? "border-orange-500 ring-4 ring-orange-400/40"
                      : "border-slate-300"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header badge & Code */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-200 px-2.5 py-0.5 rounded-full font-mono">
                        {course.code}
                      </span>
                      <span className="text-xs font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {isAmharic ? course.levelAm : course.level}
                      </span>
                    </div>

                    {/* Native h2 Title for each Card (User Requirement) */}
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 leading-snug">
                        {isAmharic ? course.titleAm : course.title}
                      </h2>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                        <span className="font-semibold text-slate-900">
                          {isAmharic ? "ማብራሪያ፦ " : "Description: "}
                        </span>
                        {isAmharic ? course.descriptionAm : course.description}
                      </p>
                    </div>

                    {/* Metadata: Level, Duration, and Price (User Requirement) */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block">
                          {isAmharic ? "ደረጃ" : "Level"}
                        </span>
                        <span className="font-bold text-slate-900">
                          {isAmharic ? course.levelAm : course.level}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" aria-hidden="true" />
                          <span>{isAmharic ? "የጊዜ ርዝማኔ" : "Duration"}</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {isAmharic ? course.durationAm : course.duration}
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                          <span>{isAmharic ? "ዋጋ" : "Price"}</span>
                        </span>
                        <span className="text-base font-extrabold text-[#0B132B]">
                          {course.price}
                        </span>
                      </div>
                    </div>

                    {/* Syllabus modules */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200">
                      <span className="text-xs font-semibold text-slate-800 block">
                        {isAmharic ? "ዋና ዋና ሞጁሎች፦" : "Syllabus modules:"}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {course.syllabus.map((item) => (
                          <span
                            key={item}
                            className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-600 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{course.audioMinutes} min Audio Narration &amp; Live Quizzes</span>
                    </div>
                  </div>

                  {/* Actions: "Choose this course" button whose accessible name includes title (User Requirement) */}
                  <div className="pt-4 border-t border-slate-200 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenConfirmDialog(course)}
                      id={`choose-course-${course.id}`}
                      data-testid={`select-${course.id}-btn`}
                      aria-label={`Choose this course: ${course.title}`}
                      className="w-full min-h-[48px] bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold py-3 px-6 rounded-lg text-sm flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer transition-colors"
                    >
                      <span>{isAmharic ? "ይህን ኮርስ ምረጥ" : "Choose this course"}</span>
                      <ArrowRight className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReadDetails(course)}
                      id={`read-course-${course.id}-btn`}
                      className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                      <span>
                        {isAmharic ? "የኮርሱን ማብራሪያ በድምጽ አዳምጥ" : "Hear course description aloud"}
                      </span>
                      <span className="sr-only">
                        {" "}
                        for {isAmharic ? course.titleAm : course.title}
                      </span>
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirmation Dialog (F0 Rule 8: Native trap, Escape close, return focus to trigger) */}
      <Dialog.Root
        open={!!confirmingCourse}
        onOpenChange={(open) => {
          if (!open) handleCancelConfirmDialog();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content
            id="course-confirm-dialog"
            data-testid="course-confirm-dialog"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#0B132B] shadow-2xl z-50 focus:outline-none focus:ring-4 focus:ring-orange-400 space-y-6"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <Dialog.Title
                  id="confirm-dialog-title"
                  className="text-2xl font-black text-slate-900 tracking-tight"
                >
                  {isAmharic ? "የኮርስ ምርጫ ማረጋገጫ" : "Confirm Course Choice"}
                </Dialog.Title>
                <span className="text-xs text-slate-500 font-mono">{confirmingCourse?.code}</span>
              </div>
            </div>

            {/* Exact Plain Language Confirmation Prompt (User Requirement) */}
            <Dialog.Description
              id="confirm-dialog-description"
              className="text-base text-slate-800 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-200"
            >
              {isAmharic
                ? `«${confirmingCourse?.titleAm}»ን መርጠዋል። ዋጋው ${confirmingCourse?.price} ነው። ወደ ክፍያ መቀጠል ይፈልጋሉ?`
                : `You chose ${confirmingCourse?.title}. The price is ${confirmingCourse?.price}. Continue to payment?`}
            </Dialog.Description>

            {/* Error state in dialog (F0 Rule 16) */}
            {enrollmentError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3.5 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800 font-semibold space-y-1"
              >
                <div className="flex items-center gap-1.5 text-red-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
                  <span>{isAmharic ? "ስህተት" : "Error"}</span>
                </div>
                <p>{enrollmentError}</p>
              </div>
            )}

            {/* Dialog Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                id="cancel-enrollment-btn"
                onClick={handleCancelConfirmDialog}
                disabled={isEnrolling}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-50"
              >
                {isAmharic ? "አይ፣ ተመለስ" : "No, go back"}
              </button>

              <button
                type="button"
                id="confirm-enrollment-btn"
                onClick={handleConfirmEnrollment}
                disabled={isEnrolling}
                className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold rounded-lg text-sm flex items-center justify-center gap-2 border-2 border-orange-500 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isEnrolling ? (
                  <span>{isAmharic ? "በማስኬድ ላይ..." : "Processing..."}</span>
                ) : (
                  <>
                    <span>{isAmharic ? "አዎ፣ ወደ ክፍያ ቀጥል" : "Yes, continue to payment"}</span>
                    <ArrowRight className="w-4 h-4 text-orange-400" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Support Callout */}
      <aside
        aria-label="Course assistance"
        className="bg-slate-50 border border-slate-300 rounded-xl p-6 text-center space-y-2"
      >
        <p className="text-sm text-slate-700">
          {isAmharic
            ? "የትኛው የትምህርት ዘርፍ ለሙያዎ እንደሚስማማ እርግጠኛ አይደሉም?"
            : "Unsure which path is right for your career goals?"}
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Link
            href="/payment#human-help"
            className="inline-flex items-center gap-1 text-sm font-bold text-orange-800 hover:text-orange-950 underline focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
          >
            <span>{isAmharic ? "የሰው አጋዥ መመሪያ ይጠይቁ" : "Ask a Human Helper for Guidance"}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
