export type SupportedLanguage = 'en-US' | 'am-ET';

export interface Translations {
  nav: {
    home: string;
    courses: string;
    about: string;
    support: string;
    login: string;
    register: string;
    accessibleLearning: string;
    skipToContent: string;
    langToggleLabel: string;
    langCurrentLabel: string;
  };
  home: {
    announcementText: string;
    announcementLink: string;
    heroCategory: string;
    heroTitle: string;
    heroDescription: string;
    exploreBtn: string;
    voiceBtn: string;
    badgeMostPopular: string;
    badgeSavanna: string;
    badgeFastTrack: string;
    curriculumTitle: string;
    curriculumSubtitle: string;
    filterAll: string;
    filterData: string;
    filterComm: string;
    filterVA: string;
    startCourseBtn: string;
    a11yTitle: string;
    a11ySubtitle: string;
    stat1: string;
    stat1Label: string;
    stat2: string;
    stat2Label: string;
    stat3: string;
    stat3Label: string;
    footerCopyright: string;
  };
  login: {
    title: string;
    subtitle: string;
    emailLabel: string;
    passwordLabel: string;
    required: string;
    forgotPassword: string;
    rememberMe: string;
    signInBtn: string;
    signingIn: string;
    orContinueWith: string;
    googleSignIn: string;
    a11yCalloutTitle: string;
    a11yCalloutDesc: string;
    a11yRegisterBtn: string;
    a11yOtpOption: string;
    otpTitle: string;
    otpDesc: string;
    otpCodeLabel: string;
    otpSendBtn: string;
    otpVerifyBtn: string;
    switchToPassword: string;
    secureFooter: string;
  };
  register: {
    title: string;
    subtitle: string;
    fullNameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    langPrefLabel: string;
    privacyHeading: string;
    privacySummary: string;
    consentLabel: string;
    submitBtn: string;
    otpTitle: string;
    otpDesc: string;
    otpLabel: string;
    verifyBtn: string;
    assistantTitle: string;
    assistantReadyBadge: string;
    assistantActiveDesc: string;
    assistantIdleDesc: string;
    startAssistantBtn: string;
    pauseAssistantBtn: string;
    assistantSays: string;
    listeningBadge: string;
    speakingBadge: string;
  };
  courses: {
    title: string;
    subtitle: string;
    assistantTitle: string;
    assistantReadyBadge: string;
    assistantActiveDesc: string;
    assistantIdleDesc: string;
    startAssistantBtn: string;
    pauseAssistantBtn: string;
    selectBtn: string;
    listenOverviewBtn: string;
    allFilter: string;
    comprehensiveFilter: string;
    supportTitle: string;
    supportAction: string;
  };
  assistant: {
    welcome: string;
    listening: string;
    paused: string;
    callHuman: string;
    pageArrival: Record<string, string>;
  };
}

export const translations: Record<SupportedLanguage, Translations> = {
  'en-US': {
    nav: {
      home: 'Home',
      courses: 'Courses',
      about: 'About',
      support: 'Support',
      login: 'Login',
      register: 'Register',
      accessibleLearning: 'Accessible Learning',
      skipToContent: 'Skip to main content',
      langToggleLabel: 'Switch language to Amharic. Current language is English.',
      langCurrentLabel: 'EN (US)',
    },
    home: {
      announcementText: 'Enrolment for 2026 has now closed. Something new is coming in 2027.',
      announcementLink: 'Register your interest to hear first.',
      heroCategory: 'AI & Data > Data Analytics',
      heroTitle: 'Data Analytics',
      heroDescription:
        'Companies across every industry are hiring people who can turn data into decisions that drive real results. This is how you become one of them.',
      exploreBtn: 'Explore Programmes',
      voiceBtn: 'Start Voice Assistant',
      badgeMostPopular: 'Most Popular',
      badgeSavanna: 'Savanna Curriculum',
      badgeFastTrack: 'Fast-Track',
      curriculumTitle: 'Industry-Calibrated Programmes',
      curriculumSubtitle:
        'Master high-demand tech skills through fully accessible audio lectures, screen-reader optimized exercises, and live voice quizzes.',
      filterAll: 'All Programmes',
      filterData: 'Data & AI',
      filterComm: 'Professional Skills',
      filterVA: 'Virtual Operations',
      startCourseBtn: 'Explore Programme',
      a11yTitle: 'Built from Day One for Total Accessibility',
      a11ySubtitle:
        'Conforming to WCAG 2.2 AA / AAA standards so blind and visually impaired learners achieve career excellence without barriers.',
      stat1: '100%',
      stat1Label: 'Keyboard Navigable with Zero Traps',
      stat2: '0.80x',
      stat2Label: 'Calm, Clear Audio Assistant Cadence',
      stat3: 'WCAG AAA',
      stat3Label: 'High-Contrast Text & Visible 3px Focus Rings',
      footerCopyright: '© 2026 ALX Africa & Ableway. Empowering accessible tech careers across Africa and beyond.',
    },
    login: {
      title: 'Sign in to your account',
      subtitle: 'Welcome back! Please enter your details to access your learning portal.',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      required: '(required)',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me for 30 days',
      signInBtn: 'Sign in to ALX',
      signingIn: 'Signing in...',
      orContinueWith: 'Or continue with',
      googleSignIn: 'Continue with Google',
      a11yCalloutTitle: 'Need an Accessible Experience?',
      a11yCalloutDesc:
        'Ableway provides blind and visually impaired learners with hands-free spoken voice dialog, screen reader optimization, and zero CAPTCHAs.',
      a11yRegisterBtn: 'Create Account (Accessible Registration)',
      a11yOtpOption: 'Or sign in with a passkey (no password)',
      otpTitle: 'Accessible Sign-In',
      otpDesc: 'We will send a 6-digit one-time code to this address. No password or CAPTCHA required.',
      otpCodeLabel: '6-Digit One-Time Code',
      otpSendBtn: 'Send One-Time Code',
      otpVerifyBtn: 'Sign In',
      switchToPassword: 'Switch to password login',
      secureFooter: 'Secure authentication for ALX & Ableway platforms',
    },
    register: {
      title: 'Create your account',
      subtitle:
        'Accessible registration designed for keyboard and spoken voice dialog. No CAPTCHAs, persistent labels, and live audio guidance.',
      fullNameLabel: 'Full name',
      emailLabel: 'Email address',
      phoneLabel: 'Phone number (optional)',
      langPrefLabel: 'Preferred learning language',
      privacyHeading: 'Plain-language privacy summary (F0 Rule 15)',
      privacySummary:
        'We collect your name, email, phone number, and preferred language only to create your account, deliver lessons, and provide help. We never sell your personal information or share it with third parties to train AI models.',
      consentLabel: 'I have read and agree to the plain-language privacy summary (explicit yes required)',
      submitBtn: 'Create Account & Send Code',
      otpTitle: 'Verify your email with a one-time code',
      otpDesc: 'We sent a 6-digit code to your email. Enter or paste it below to complete registration.',
      otpLabel: '6-digit one-time code',
      verifyBtn: 'Verify Code & Go to Course Choice',
      assistantTitle: 'Spoken Assistant',
      assistantReadyBadge: 'Hands-Free Voice Active',
      assistantActiveDesc:
        'Speaking slowly and listening automatically without needing to click the mic button.',
      assistantIdleDesc:
        'Start the assistant once to guide you hands-free question by question.',
      startAssistantBtn: 'Start Voice Assistant',
      pauseAssistantBtn: 'Pause Assistant',
      assistantSays: 'Assistant says:',
      listeningBadge: 'Listening hands-free...',
      speakingBadge: 'Speaking slowly...',
    },
    courses: {
      title: 'Choose a course',
      subtitle:
        'Select a programme below to start your audio lessons and practice quizzes. You can navigate by keyboard or use the spoken assistant to choose hands-free.',
      assistantTitle: 'Spoken Course Assistant',
      assistantReadyBadge: 'Voice Selection Ready',
      assistantActiveDesc: 'Speaking slowly and listening automatically for your course choice.',
      assistantIdleDesc: 'Start the assistant to hear course recommendations and select by voice.',
      startAssistantBtn: 'Start Voice Assistant',
      pauseAssistantBtn: 'Pause Assistant',
      selectBtn: 'Select & Start Lessons',
      listenOverviewBtn: 'Hear Course Description Aloud',
      allFilter: 'All Courses',
      comprehensiveFilter: 'Comprehensive',
      supportTitle: 'Unsure which path is right for your career goals?',
      supportAction: 'Ask a Human Helper for Guidance',
    },
    assistant: {
      welcome:
        'Hello! I am your Ableway Assistant. Press Alt+V to speak or type your question. Say "Help" for options or "Call human" for live support.',
      listening: 'Listening for your command or answers.',
      paused: 'Microphone paused.',
      callHuman: 'Connecting you to a live human helper...',
      pageArrival: {
        '/': 'You are on the Ableway Home and Savanna Hub. You can register, choose a course, or open Savanna.',
        '/register': 'You are on the Registration page. I can fill the form as you speak your details.',
        '/courses': 'You are on the Course Choice page. Ask me to describe or compare courses.',
        '/login': 'You are on the Sign In page. Sign in with email and password or use accessible login.',
        '/payment': 'You are on the Payment page. We use human-assisted payments with staff guidance.',
        '/learn': 'You are on the Learning Platform. You can explore course modules, audio lessons, and quizzes.',
        '/profile': 'You are on your Profile page. You can manage settings or link your Telegram account.',
        '/staff/help-queue': 'Staff Console: Accessible Human Helper Queue.',
        '/savanna': 'Savanna Learning Portal view.',
      },
    },
  },

  'am-ET': {
    nav: {
      home: 'መነሻ',
      courses: 'ኮርሶች',
      about: 'ስለ እኛ',
      support: 'ድጋፍ',
      login: 'ግባ',
      register: 'ተመዝገብ',
      accessibleLearning: 'ተደራሽ ትምህርት',
      skipToContent: 'ወደ ዋናው ይዘት ዝለል',
      langToggleLabel: 'ወደ እንግሊዝኛ ቋንቋ ቀይር። የአሁን ቋንቋ አማርኛ ነው።',
      langCurrentLabel: 'አማ (AM)',
    },
    home: {
      announcementText: 'የ2026 ምዝገባ ተጠናቋል። ለ2027 አዲስ ነገር ይዘን እየመጣን ነው።',
      announcementLink: 'መረጃዎችን አስቀድመው ለማግኘት ፍላጎትዎን ይመዝግቡ።',
      heroCategory: 'አርቴፊሻል ኢንተለጀንስ እና ዳታ > ዳታ አናሊቲክስ',
      heroTitle: 'ዳታ አናሊቲክስ (Data Analytics)',
      heroDescription:
        'በሁሉም የሥራ ዘርፎች የሚገኙ ድርጅቶች ዳታን ወደ ውጤታማ የንግድ ውሳኔ መለወጥ የሚችሉ ባለሙያዎችን እየፈለጉ ነው። ይህንን እንዴት መማር እንደሚችሉ ይመልከቱ።',
      exploreBtn: 'ኮርሶችን ይመልከቱ',
      voiceBtn: 'የድምጽ ረዳቱን ጀምር',
      badgeMostPopular: 'በጣም ተወዳጅ',
      badgeSavanna: 'የሳቫና ስርዓተ-ትምህርት',
      badgeFastTrack: 'ፈጣን ስልጠና',
      curriculumTitle: 'ተፈላጊ የሥራ ክህሎት ፕሮግራሞች',
      curriculumSubtitle:
        'በድምጽ ትምህርቶች፣ ለስክሪን ሪደር በተመቻቹ ልምምዶች እና በድምጽ ፈተናዎች ተፈላጊ የቴክኖሎጂ ክህሎቶችን ይማሩ።',
      filterAll: 'ሁሉም ፕሮግራሞች',
      filterData: 'ዳታ እና AI',
      filterComm: 'የሥራ ቦታ ተግባቦት',
      filterVA: 'ቨርቹዋል አሲስታንት',
      startCourseBtn: 'ፕሮግራሙን ይመልከቱ',
      a11yTitle: 'ከመጀመሪያው ጀምሮ ለሙሉ ተደራሽነት የተገነባ',
      a11ySubtitle:
        'የእይታ እክል ያለባቸው ተማሪዎች ያለ ምንም እንቅፋት የላቀ የሙያ ደረጃ ላይ እንዲደርሱ በWCAG 2.2 AA / AAA መስፈርቶች የተሰራ።',
      stat1: '100%',
      stat1Label: 'በኪቦርድ ብቻ ሙሉ በሙሉ የሚሰራ',
      stat2: '0.80x',
      stat2Label: 'የረጋ እና ግልጽ የድምጽ ረዳት ፍጥነት',
      stat3: 'WCAG AAA',
      stat3Label: 'ከፍተኛ ንፅፅር እና ግልጽ ባለ 3 ፒክስል መመሪያ ቀለበት',
      footerCopyright: '© 2026 ALX አፍሪካ እና ኤብልዌይ። በመላው አፍሪካ ተደራሽ የቴክኖሎጂ ስራዎችን ማብቃት።',
    },
    login: {
      title: 'ወደ መለያዎ ይግቡ',
      subtitle: 'እንኳን ደህና መጡ! ወደ መማሪያ ፖርታልዎ ለመግባት መረጃዎን ያስገቡ።',
      emailLabel: 'የኢሜይል አድራሻ',
      passwordLabel: 'የይለፍ ቃል',
      required: '(አስፈላጊ)',
      forgotPassword: 'የይለፍ ቃል ረሱ?',
      rememberMe: 'ለ30 ቀናት አስታውሰኝ',
      signInBtn: 'ወደ ALX ግባ',
      signingIn: 'በመግባት ላይ...',
      orContinueWith: 'ወይም በዚህ ይቀጥሉ',
      googleSignIn: 'በGoogle ቀጥል',
      a11yCalloutTitle: 'ተደራሽ የሆነ አገልግሎት ይፈልጋሉ?',
      a11yCalloutDesc:
        'ኤብልዌይ ለእይታ እክል ላለባቸው ተማሪዎች እጅ-አልባ የድምጽ ውይይት፣ የስክሪን ሪደር ድጋፍ እና ያለ CAPTCHA ፈጣን ምዝገባ ያቀርባል።',
      a11yRegisterBtn: 'አካውንት ይፍጠሩ (ተደራሽ ምዝገባ)',
      a11yOtpOption: 'ወይም ያለይለፍ ቃል በፓስኪ ይግቡ',
      otpTitle: 'ተደራሽ መግቢያ',
      otpDesc: 'ባለ 6 ድጂት ጊዜያዊ ኮድ ወደ ኢሜይልዎ እንልካለን። ምንም ዓይነት የይለፍ ቃል ወይም CAPTCHA አያስፈልግም።',
      otpCodeLabel: 'ባለ 6 ድጂት ጊዜያዊ ኮድ',
      otpSendBtn: 'ጊዜያዊ ኮድ ላክ',
      otpVerifyBtn: 'ግባ',
      switchToPassword: 'ወደ ይለፍ ቃል መግቢያ ተመለስ',
      secureFooter: 'ለALX እና ኤብልዌይ መድረኮች የተጠበቀ ደህንነት ያለው መግቢያ',
    },
    register: {
      title: 'አካውንትዎን ይፍጠሩ',
      subtitle:
        'ለኪቦርድ እና ለድምጽ ውይይት የተመቻቸ ተደራሽ ምዝገባ። ያለ CAPTCHA፣ ቋሚ መለያዎች እና የቀጥታ የድምጽ መመሪያ ያለው።',
      fullNameLabel: 'ሙሉ ስም',
      emailLabel: 'የኢሜይል አድራሻ',
      phoneLabel: 'ስልክ ቁጥር (አማራጭ)',
      langPrefLabel: 'የመማሪያ ቋንቋ ምርጫ',
      privacyHeading: 'ቀጥተኛ እና ግልጽ የግላዊነት ማጠቃለያ (F0 Rule 15)',
      privacySummary:
        'የእርስዎን ስም፣ ኢሜይል፣ ስልክ ቁጥር እና የመረጡትን ቋንቋ የምንሰበስበው አካውንት ለመፍጠር፣ ትምህርቶችን ለመስጠት እና እገዛ ለማድረግ ብቻ ነው። የግል መረጃዎን በጭራሽ አንሸጥም ወይም ለሶስተኛ ወገን አናስተላልፍም።',
      consentLabel: 'የግላዊነት ማጠቃለያውን አንብቤ እስማማለሁ (ግልጽ የሆነ አዎ ይፈለጋል)',
      submitBtn: 'አካውንት ፍጠር እና ኮድ ላክ',
      otpTitle: 'ኢሜይልዎን በጊዜያዊ ኮድ ያረጋግጡ',
      otpDesc: 'ባለ 6 ድጂት ኮድ ወደ ኢሜይልዎ ልከናል። ምዝገባውን ለማጠናቀቅ ከታች ያስገቡ።',
      otpLabel: 'ባለ 6 ድጂት ጊዜያዊ ኮድ',
      verifyBtn: 'ኮዱን አረጋግጥ እና ወደ ኮርስ ምርጫ ሂድ',
      assistantTitle: 'የድምጽ ረዳት',
      assistantReadyBadge: 'እጅ-አልባ ድምጽ ዝግጁ',
      assistantActiveDesc:
        'የማይክራፎን ቁልፉን መጫን ሳያስፈልግዎ በዝግታ እየተናገረ እና ድምጽዎን እያዳመጠ ይገኛል።',
      assistantIdleDesc:
        'ጥያቄ በጥያቄ እጅ-አልባ በሆነ መንገድ እንዲመራዎት የድምጽ ረዳቱን አንድ ጊዜ ያስጀምሩት።',
      startAssistantBtn: 'የድምጽ ረዳቱን ጀምር',
      pauseAssistantBtn: 'ረዳቱን አቁም',
      assistantSays: 'ረዳቱ እንዲህ ይላል፦',
      listeningBadge: 'እጅ-አልባ በማዳመጥ ላይ...',
      speakingBadge: 'በዝግታ እየተናገረ ነው...',
    },
    courses: {
      title: 'ኮርስ ይምረጡ',
      subtitle:
        'የድምጽ ትምህርቶችን እና ፈተናዎችን ለመጀመር ከታች ካሉት ፕሮግራሞች ይምረጡ። በኪቦርድዎ ወይም በድምጽ ረዳቱ አማካኝነት መምረጥ ይችላሉ።',
      assistantTitle: 'የድምጽ ኮርስ መምረጫ ረዳት',
      assistantReadyBadge: 'በአማርኛ ድምጽ ለመምረጥ ዝግጁ',
      assistantActiveDesc: 'በዝግታ እየተናገረ እና የእርስዎን የኮርስ ምርጫ እያዳመጠ ነው።',
      assistantIdleDesc: 'የኮርስ ምክሮችን ለመስማት እና በድምጽዎ ለመምረጥ ረዳቱን ያስጀምሩ።',
      startAssistantBtn: 'የድምጽ ረዳቱን ጀምር',
      pauseAssistantBtn: 'ረዳቱን አቁም',
      selectBtn: 'ምረጥ እና ጀምር',
      listenOverviewBtn: 'የኮርሱን ማብራሪያ በድምጽ አዳምጥ',
      allFilter: 'ሁሉም ኮርሶች',
      comprehensiveFilter: 'ሙሉ ፕሮግራም',
      supportTitle: 'የትኛው የትምህርት ዘርፍ ለሙያዎ እንደሚስማማ እርግጠኛ አይደሉም?',
      supportAction: 'የሰው አጋዥ መመሪያ ይጠይቁ',
    },
    assistant: {
      welcome:
        'ሰላም! እኔ የኤብልዌይ የድምጽ ረዳትዎ ነኝ። ለመናገር ወይም ጥያቄዎን ለመተየብ Alt+V ይጫኑ። ለአማራጮች «እገዛ» ወይም የቀጥታ ድጋፍ ለማግኘት «ሰው ጥራልኝ» ይበሉ።',
      listening: 'የእርስዎን ትዕዛዝ ወይም ምላሽ በማዳመጥ ላይ...',
      paused: 'ማይክራፎን ቆሟል።',
      callHuman: 'ከቀጥታ የሰው አጋዥ ጋር በማገናኘት ላይ...',
      pageArrival: {
        '/': 'ወደ ኤብልዌይ መነሻ ገጽ በደህና መጡ። መመዝገብ፣ ኮርስ መምረጥ ወይም ሳቫናን መክፈት ይችላሉ።',
        '/register': 'ወደ ምዝገባ ገጽ መጥተዋል። መረጃዎን በሚናገሩበት ጊዜ ፎርሙን እሞላልዎታለሁ።',
        '/courses': 'ወደ ኮርስ መምረጫ ገጽ መጥተዋል። ኮርሶችን እንዳወዳድር ወይም እንዳብራራ ይጠይቁኝ።',
        '/login': 'ወደ መግቢያ ገጽ መጥተዋል። በኢሜይልዎ እና በይለፍ ቃልዎ ይግቡ ወይም ተደራሽ ምዝገባን ይምረጡ።',
        '/payment': 'ወደ ክፍያ ገጽ መጥተዋል። በሠራተኞች እገዛ የሚደረግ ክፍያ እንጠቀማለን።',
        '/learn': 'ወደ መማሪያ ገጽ መጥተዋል። የድምጽ ትምህርቶችን እና ጥያቄዎችን መከታተል ይችላሉ።',
        '/profile': 'ወደ መገለጫ ገጽዎ መጥተዋል። ቅንብሮችን ማስተካከል ወይም ቴሌግራምዎን ማገናኘት ይችላሉ።',
        '/staff/help-queue': 'የሠራተኞች ኮንሶል፦ ተደራሽ የሰው ረዳት ወረፋ።',
        '/savanna': 'የሳቫና መማሪያ ፖርታል እይታ።',
      },
    },
  },
};

export function getTranslation(lang: string): Translations {
  if (lang === 'am-ET' || lang === 'am') {
    return translations['am-ET'];
  }
  return translations['en-US'];
}
