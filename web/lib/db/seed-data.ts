/**
 * Sample data for local development and demos. All people are fake.
 * Emails use example.org and phone numbers use the fictional +1 555 01xx range.
 *
 * Course text follows our content rules: plain language, short sentences.
 * TODO: lessons have no audio_url yet. Add recorded audio when it exists.
 */

export const SEED_CURRENCY = "USD";

export type SeedProfile = {
  name: string;
  email: string;
  phone: string;
  role: "learner" | "helper" | "admin" | "content_manager";
  language: string;
};

export const seedProfiles: SeedProfile[] = [
  {
    name: "Abebe Learner",
    email: "abebe.learner@example.org",
    phone: "+15555550101",
    role: "learner",
    language: "en",
  },
  {
    name: "Grace Learner",
    email: "grace.learner@example.org",
    phone: "+15555550102",
    role: "learner",
    language: "en",
  },
  {
    name: "Samuel Learner",
    email: "samuel.learner@example.org",
    phone: "+15555550103",
    role: "learner",
    language: "en",
  },
  {
    name: "Hana Helper",
    email: "hana.helper@example.org",
    phone: "+15555550111",
    role: "helper",
    language: "en",
  },
  {
    name: "David Helper",
    email: "david.helper@example.org",
    phone: "+15555550112",
    role: "helper",
    language: "en",
  },
  {
    name: "Ada Admin",
    email: "ada.admin@example.org",
    phone: "+15555550121",
    role: "admin",
    language: "en",
  },
  {
    name: "Ruth Content",
    email: "ruth.content@example.org",
    phone: "+15555550131",
    role: "content_manager",
    language: "en",
  },
];

export type SeedQuestion = {
  prompt: string;
  choices: string[];
  correctChoice: number;
  explanation: string;
};

export type SeedLesson = { title: string; transcript: string; durationSeconds: number };

export type SeedModule = {
  title: string;
  description: string;
  lessons: SeedLesson[];
  quiz: { title: string; questions: SeedQuestion[] };
};

export type SeedCourse = {
  slug: string;
  title: string;
  description: string;
  priceMinor: number;
  modules: SeedModule[];
};

export const seedCourses: SeedCourse[] = [
  {
    slug: "computer-basics-screen-reader",
    title: "Computer Basics with a Screen Reader",
    description:
      "Learn to use a computer with your keyboard and a screen reader. No experience needed.",
    priceMinor: 0,
    modules: [
      {
        title: "Getting started",
        description: "Meet your screen reader and your keyboard.",
        lessons: [
          {
            title: "What is a screen reader?",
            transcript:
              "A screen reader is a program. It reads the screen out loud. It tells you what is on the screen. You control it with the keyboard. Many blind people use a screen reader every day.",
            durationSeconds: 240,
          },
          {
            title: "Finding keys on the keyboard",
            transcript:
              "Put your hands on the keyboard. Find the F key and the J key. Each one has a small bump. Rest your first fingers on the bumps. This is your home position. From here you can reach every letter.",
            durationSeconds: 300,
          },
        ],
        quiz: {
          title: "Getting started quiz",
          questions: [
            {
              prompt: "What does a screen reader do?",
              choices: [
                "It reads the screen out loud",
                "It makes the screen brighter",
                "It prints pages",
              ],
              correctChoice: 0,
              explanation:
                "A screen reader reads the screen out loud. You control it with the keyboard.",
            },
            {
              prompt: "Which two keys have small bumps?",
              choices: ["A and S", "F and J", "Q and P"],
              correctChoice: 1,
              explanation: "F and J have bumps. They help you find your home position.",
            },
          ],
        },
      },
      {
        title: "Files and folders",
        description: "Save your work and find it again.",
        lessons: [
          {
            title: "What is a file?",
            transcript:
              "A file holds your work. A letter can be a file. A song can be a file. Every file has a name. You use the name to find it later.",
            durationSeconds: 210,
          },
          {
            title: "Saving your work",
            transcript:
              "Press Control and S together to save. Type a name for your file. Press Enter. Your work is now saved. Save often, so you do not lose your work.",
            durationSeconds: 240,
          },
        ],
        quiz: {
          title: "Files and folders quiz",
          questions: [
            {
              prompt: "Which keys save your work?",
              choices: ["Control and S", "Alt and F4", "Shift and Tab"],
              correctChoice: 0,
              explanation: "Control and S saves your work in most programs.",
            },
            {
              prompt: "Why does a file have a name?",
              choices: ["To make it bigger", "So you can find it later", "To lock it"],
              correctChoice: 1,
              explanation: "The name helps you find the file later.",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "smartphone-with-talkback",
    title: "Using a Smartphone with TalkBack",
    description: "Use an Android phone with TalkBack. Make calls, send messages, and use apps.",
    priceMinor: 1500,
    modules: [
      {
        title: "Touch and gestures",
        description: "Move around your phone with simple gestures.",
        lessons: [
          {
            title: "Exploring by touch",
            transcript:
              "Slide one finger slowly on the screen. TalkBack reads what is under your finger. To open something, tap two times quickly. This is called a double tap.",
            durationSeconds: 270,
          },
          {
            title: "Swiping to move",
            transcript:
              "Swipe right with one finger to go to the next item. Swipe left to go back. TalkBack reads each item. This way you never miss anything on the screen.",
            durationSeconds: 240,
          },
        ],
        quiz: {
          title: "Touch and gestures quiz",
          questions: [
            {
              prompt: "How do you open an item with TalkBack?",
              choices: ["Tap once", "Double tap", "Shake the phone"],
              correctChoice: 1,
              explanation: "With TalkBack on, you double tap to open an item.",
            },
            {
              prompt: "How do you go to the next item?",
              choices: ["Swipe right", "Swipe up with three fingers", "Press the power button"],
              correctChoice: 0,
              explanation: "Swipe right with one finger to go to the next item.",
            },
          ],
        },
      },
      {
        title: "Calls and messages",
        description: "Stay in touch with people.",
        lessons: [
          {
            title: "Making a call",
            transcript:
              "Open the Phone app. Find the contact you want. Double tap their name. Then double tap Call. To end the call, find End call and double tap it.",
            durationSeconds: 240,
          },
          {
            title: "Sending a text message",
            transcript:
              "Open the Messages app. Double tap Start chat. Choose a contact. Type your message with the keyboard or your voice. Then double tap Send.",
            durationSeconds: 270,
          },
        ],
        quiz: {
          title: "Calls and messages quiz",
          questions: [
            {
              prompt: "Which app do you use to make a call?",
              choices: ["Camera", "Phone", "Clock"],
              correctChoice: 1,
              explanation: "You make calls in the Phone app.",
            },
            {
              prompt: "What is the last step to send a message?",
              choices: ["Double tap Send", "Turn off the phone", "Close the app"],
              correctChoice: 0,
              explanation: "Double tap Send to send your message.",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "getting-ready-for-work",
    title: "Getting Ready for Work",
    description: "Write a CV, find jobs, and prepare for interviews.",
    priceMinor: 2500,
    modules: [
      {
        title: "Your CV",
        description: "Tell employers about your skills.",
        lessons: [
          {
            title: "What goes in a CV?",
            transcript:
              "A CV is a short document about you. It lists your skills. It lists your education. It lists your work. Keep it to one or two pages.",
            durationSeconds: 300,
          },
          {
            title: "Talking about your skills",
            transcript:
              "Think about what you do well. Maybe you type fast. Maybe you speak two languages. Write each skill in a short sentence. Give an example if you can.",
            durationSeconds: 270,
          },
        ],
        quiz: {
          title: "Your CV quiz",
          questions: [
            {
              prompt: "How long should a CV be?",
              choices: ["One or two pages", "Ten pages", "One sentence"],
              correctChoice: 0,
              explanation: "A good CV is one or two pages long.",
            },
            {
              prompt: "What helps show a skill?",
              choices: ["A short example", "A long story", "A photo"],
              correctChoice: 0,
              explanation: "A short example shows the employer what you can do.",
            },
          ],
        },
      },
      {
        title: "Interviews",
        description: "Get ready to talk with employers.",
        lessons: [
          {
            title: "Before the interview",
            transcript:
              "Learn about the company. Plan how you will get there. You can ask for changes you need, like an accessible test. Asking is your right.",
            durationSeconds: 300,
          },
          {
            title: "Answering questions",
            transcript:
              "Listen to the whole question. Take a breath. Answer in a few sentences. If you do not understand, ask them to say it again.",
            durationSeconds: 240,
          },
        ],
        quiz: {
          title: "Interviews quiz",
          questions: [
            {
              prompt: "Can you ask for changes you need, like an accessible test?",
              choices: ["Yes, it is your right", "No, never"],
              correctChoice: 0,
              explanation: "You can ask for the changes you need. It is your right.",
            },
            {
              prompt: "What can you do if you do not understand a question?",
              choices: ["Ask them to say it again", "Leave the room", "Say nothing"],
              correctChoice: 0,
              explanation: "It is fine to ask them to repeat the question.",
            },
          ],
        },
      },
    ],
  },
];

export type SeedJob = {
  title: string;
  employer: string;
  location: string;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "volunteer";
  description: string;
  requirements: string;
  howToApply: string;
  /** Days from the seed date. Keeps deadlines in the future. */
  deadlineInDays: number;
  accessibilityNotes: string;
};

export const seedJobs: SeedJob[] = [
  {
    title: "Customer Support Agent",
    employer: "Example Telecom",
    location: "Remote",
    jobType: "full_time",
    description: "Answer customer calls and chats. Help people fix simple problems.",
    requirements: "Good speaking skills. Basic computer skills. Typing at 30 words per minute.",
    howToApply: "Send your CV by email to jobs@example.org.",
    deadlineInDays: 30,
    accessibilityNotes: "Our tools work with JAWS and NVDA. Training is in audio.",
  },
  {
    title: "Data Entry Clerk",
    employer: "Example Records Office",
    location: "City centre",
    jobType: "part_time",
    description: "Type information from forms into a database.",
    requirements: "Fast, accurate typing. Basic spreadsheet skills.",
    howToApply: "Call +15555550190 and ask for the hiring team.",
    deadlineInDays: 21,
    accessibilityNotes: "Screen reader provided. Office has step-free access.",
  },
  {
    title: "Transcription Assistant",
    employer: "Example Media Studio",
    location: "Remote",
    jobType: "contract",
    description: "Listen to recordings and type what people say.",
    requirements: "Strong listening skills. Good spelling. Own computer.",
    howToApply: "Send your CV and a short voice note to work@example.org.",
    deadlineInDays: 14,
    accessibilityNotes: "All work files are audio and plain text.",
  },
  {
    title: "Accessibility Tester Intern",
    employer: "Example Software House",
    location: "Remote",
    jobType: "internship",
    description: "Test apps and websites with a screen reader. Report problems you find.",
    requirements: "Daily screen reader use. Clear writing.",
    howToApply: "Fill in the form at https://jobs.example.org/a11y-intern.",
    deadlineInDays: 45,
    accessibilityNotes: "Paid internship. Flexible hours. Mentor support.",
  },
  {
    title: "Call Centre Team Member",
    employer: "Example Bank",
    location: "City centre",
    jobType: "full_time",
    description: "Answer customer questions by phone.",
    requirements: "Clear speaking. Patience. Basic computer skills.",
    howToApply: "Send your CV to careers@example.org.",
    deadlineInDays: 28,
    accessibilityNotes: "Braille display and screen reader available on request.",
  },
];
