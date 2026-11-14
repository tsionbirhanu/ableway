import type { IngestSource } from "./types";

export const STATIC_KNOWLEDGE_SOURCES: IngestSource[] = [
  // -------------------------------------------------------------------
  // 1. Platform Help Pages
  // -------------------------------------------------------------------
  {
    sourceType: "help_article",
    sourceId: null,
    title: "Ableway Platform Overview and Navigation",
    language: "en",
    status: "published",
    text: `Welcome to Ableway. Ableway is an accessible learning and employment platform built specifically for blind, visually impaired, and assistive technology users.
You can navigate the entire platform using keyboard shortcuts or voice commands.
To open the AI Web Assistant at any time, press Alt+Shift+A.
To speak directly to the assistant with push-to-talk voice mode, press and hold Alt+Shift+S.
All pages follow WCAG 2.2 AA accessibility standards with single h1 headings, skip links, aria-live status regions, and audible earcon sound feedback.
Main sections include Courses (/courses) to browse and enroll in programs, Learning Dashboard (/learn) to listen to audio lessons, Jobs (/jobs) to explore accessible employment opportunities, Payment (/payment) for course fees, and Profile (/profile) for your account settings and accessibility preferences.`,
  },
  {
    sourceType: "help_article",
    sourceId: null,
    title: "የኤብልዌይ (Ableway) መድረክ አጠቃላይ መመሪያ እና ዳሰሳ",
    language: "am-ET",
    status: "published",
    text: `እንኳን ወደ ኤብልዌይ (Ableway) በደህና መጡ። ኤብልዌይ ለአይነ ስውራን እና ማየት ለተሳናቸው ተማሪዎች የተዘጋጀ ተደራሽ የትምህርት እና የሥራ ዕድል መድረክ ነው።
መላውን መድረክ በኪቦርድ አቋራጮች ወይም በድምጽ ትዕዛዞች ማሰስ ይችላሉ።
የድምጽ ረዳቱን በማንኛውም ጊዜ ለመክፈት Alt+Shift+A ይጫኑ።
በቀጥታ ድምጽዎን ለመናገር Alt+Shift+S ን ተጭነው ይያዙ።
ዋና ዋና ክፍሎች ኮርሶች (/courses)፣ የትምህርት ገጽ (/learn)፣ የስራ እድሎች (/jobs)፣ የክፍያ ገጽ (/payment) እና የግል ማህደር (/profile) ያካትታሉ።`,
  },

  // -------------------------------------------------------------------
  // 2. Telegram How-to Guides
  // -------------------------------------------------------------------
  {
    sourceType: "help_article",
    sourceId: null,
    title: "How to Link and Use Telegram with Ableway",
    language: "en",
    status: "published",
    text: `Ableway integrates seamlessly with Telegram so you can study and receive alerts on your phone without internet browsers.
To link your Telegram account:
1. Go to your Profile page (/profile) and find the Telegram section.
2. Select 'Connect Telegram' to generate your one-time secure linking code or deep-link.
3. Open Telegram and search for the official Ableway bot (@ableway_bot).
4. Send /start followed by your linking code.
Once connected, the Telegram bot can send you daily audio lessons as voice notes, remind you of practice quizzes, deliver job vacancy notifications matching your skills, and allow you to ask the assistant questions using Telegram voice messages.`,
  },
  {
    sourceType: "help_article",
    sourceId: null,
    title: "የቴሌግራም አጠቃቀም እና ከኤብልዌይ ጋር የማገናኘት መመሪያ",
    language: "am-ET",
    status: "published",
    text: `ኤብልዌይ ከቴሌግራም ጋር በቀጥታ ይገናኛል፤ በዚህም በስልክዎ የድምጽ ትምህርቶችን እና የስራ ማስታወቂያዎችን ማግኘት ይችላሉ።
ቴሌግራምን ለማገናኘት፦
1. ወደ ግል ማህደርዎ ገጽ (/profile) ይሂዱና የቴሌግራም ማገናኛን ይፈልጉ።
2. 'ቴሌግራም አገናኝ' የሚለውን በመጫን የማረጋገጫ ኮድ ያግኙ።
3. በቴሌግራም የኤብልዌይ ቦትን (@ableway_bot) ያግኙና /start የሚለውን ይላኩ።
ከተገናኘ በኋላ የድምጽ ትምህርቶች፣ የፈተና ማሳሰቢያዎች እና የስራ ማስታወቂያዎች በቴሌግራም ይደርሱዎታል።`,
  },

  // -------------------------------------------------------------------
  // 3. Payment and Human Help Process
  // -------------------------------------------------------------------
  {
    sourceType: "help_article",
    sourceId: null,
    title: "Payment Process and Human Payment Assistance",
    language: "en",
    status: "published",
    text: `Ableway offers both free and paid courses. Paid courses typically cost 500 ETB.
We accept Telebirr, Commercial Bank of Ethiopia (CBE), and direct mobile transfers.
If you need any assistance completing your payment, Ableway provides a dedicated Human Helper service:
- You can request human assistance on the Payment page (/payment) or by telling the voice assistant 'Call a person'.
- A verified human staff helper will reach out via phone call, Telegram, or live chat.
- Critical Security Rule: An Ableway helper will NEVER ask for your password, PIN, OTP, or mobile banking secret codes. Never share your bank PIN with anyone.
Once your payment is verified by our team, your course is unlocked immediately and your learning materials become available.`,
  },
  {
    sourceType: "help_article",
    sourceId: null,
    title: "የክፍያ ሂደት እና የሰው አጋዥ ድጋፍ መመሪያ",
    language: "am-ET",
    status: "published",
    text: `በኤብልዌይ ላይ ነጻ እና የሚከፈልባቸው ኮርሶች አሉ። የሚከፈልባቸው ኮርሶች ዋጋ 500 የኢትዮጵያ ብር (500 ETB) ነው።
ክፍያዎችን በቴሌብር (Telebirr) ወይም በኢትዮጵያ ንግድ ባንክ (CBE) መፈጸም ይቻላል።
ክፍያ ሲፈጽሙ እርዳታ ከፈለጉ የሰው አጋዥ እንዲረዳዎት መጠየቅ ይችላሉ፦
- በክፍያ ገጽ (/payment) ላይ 'የሰው አጋዥ ጠይቅ' የሚለውን ይጫኑ ወይም ለድምጽ ረዳቱ 'የሰው አጋዥ ጥራልኝ' ይበሉ።
- አንድ የኤብልዌይ ሰራተኛ በስልክ ወይም በቴሌግራም ያነጋግርዎታል።
- ወሳኝ የደህንነት ህግ፦ የኤብልዌይ አጋዥ ሰራተኞች በፍጹም የባንክ ሚስጥር ቁጥርዎን (PIN) ወይም የይለፍ ቃልዎን አይጠይቁም። ለማንም ሰው የይለፍ ቃልዎን አይስጡ።`,
  },

  // -------------------------------------------------------------------
  // 4. Course Pricing and Catalog FAQ
  // -------------------------------------------------------------------
  {
    sourceType: "faq",
    sourceId: null,
    title: "Course Catalog, Durations, Costs, and Prices",
    language: "en",
    status: "published",
    text: `Ableway offers four comprehensive courses and training programs to choose from. Here is the full course catalog, duration, and cost:
1. Data Analytics (DA-100): 14 Weeks (56 Hours). Price: 500 ETB. Covers SQL databases, Python data analytics, Tableau dashboards, and accessible data interpretation.
2. Fundamentals of Effective Communication (WR-100): 10 Weeks (40 Hours). Price: Free. Covers professional writing, emails, presentations, and remote collaboration.
3. Virtual Assistant Foundations (VA-101): 8 Weeks (32 Hours). Price: 500 ETB. Covers calendar scheduling, inbox triage, Google Workspace, and remote executive support.
4. Digital Accessibility & Assistive Tech Mastery (AT-101): 6 Weeks (24 Hours). Price: Free. Covers NVDA, JAWS, TalkBack, keyboard shortcuts, and accessibility auditing.
All courses include bite-sized audio lessons, interactive practice quizzes, and certificates upon completion.`,
  },
  {
    sourceType: "faq",
    sourceId: null,
    title: "የኮርሶች ዝርዝር፣ የጊዜ ርዝማኔ እና ዋጋ",
    language: "am-ET",
    status: "published",
    text: `ኤብልዌይ 4 ዋና ዋና የስልጠና ፕሮግራሞችን ያቀርባል፦
1. ዳታ አናሊቲክስ (Data Analytics DA-100)፦ 14 ሳምንታት (56 ሰዓታት)። ዋጋው 500 የኢትዮጵያ ብር (500 ETB)። የSQL ዳታቤዝ፣ ፓይተን እና ዳታ ትንተናን ያጠቃልላል።
2. የሥራ ቦታ ተግባቦት (Effective Communication WR-100)፦ 10 ሳምንታት (40 ሰዓታት)። ዋጋው ነጻ (Free)። የቢሮ ተግባቦት እና የኢሜይል አጻጻፍን ያስተምራል።
3. ቨርቹዋል አሲስታንት (Virtual Assistant VA-101)፦ 8 ሳምንታት (32 ሰዓታት)። ዋጋው 500 የኢትዮጵያ ብር (500 ETB)። የርቀት ስራ የቢሮ ረዳትነት ስልጠና ነው።
4. አስስቲቭ ቴክኖሎጂ እና ዲጂታል ተደራሽነት (Assistive Tech AT-101)፦ 6 ሳምንታት (24 ሰዓታት)። ዋጋው ነጻ (Free)። NVDA, JAWS እና TalkBack አጠቃቀምን ያስተምራል።`,
  },
];
