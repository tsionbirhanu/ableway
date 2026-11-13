# Ableway: AI-Assisted Learning and Employment Platform

> **SRS Version 2.0 (Track 3: Multilingual Assistant & Live Help)**  
> Designed for blind and visually impaired (BVI) learners. Conforms to **WCAG 2.2 Level AA**.

---

## 1. Project Overview & Architecture

Ableway provides a unified accessible learning platform with two cooperative AI assistants:
1. **Web Assistant**: Embedded across all web pages. Operable by voice, keyboard, or touch. Fills forms from spoken input, explains and compares courses, requests human payment assistance, navigates learning modules, and answers lesson questions grounded in course materials.
2. **Telegram Assistant**: Built with **grammY** (`@AblewayBot`). Delivers accessible job listings, allows voice-note and text interactions, provides step-by-step Telegram usage tutorials, handles forwarded channel job posts, sends alert notifications, and connects learners to human helpers.
3. **Human Helper Queue (Staff Console)**: Real-time support queue where staff and volunteers accept requests, contact learners, take over conversations, and verify course payments (no card/mobile money credentials stored).
4. **Shared Assistant Core**: One unified server module powering both Web and Telegram assistants using **Gemini API** with **pgvector RAG** grounding, allowed action validation, and automated distress/escalation triggers.
5. **Authentic ALX Savanna Pages**: Preserved authentic curriculum portal templates (`homepage-v1-paced.html`, `homepage-v1-self-paced.html`, `concept-with-navigation.html`) integrated with the Ableway voice assistant toolbar and accessible controls.

```
ableway/
├── backend/                       # Shared Backend & Telegram Service
│   ├── src/
│   │   ├── assistant-core/        # Shared core for Web & Telegram assistants
│   │   │   ├── core.ts            # Processing pipeline & function caller
│   │   │   ├── actions.ts         # Allowed actions (fill_field, go_to_page, etc.)
│   │   │   ├── prompts.ts         # Multilingual prompts & grounding rules
│   │   │   ├── rag.ts             # pgvector knowledge base retrieval
│   │   │   ├── safety.ts          # Distress detection & prompt-injection defense
│   │   │   └── types.ts           # Shared interfaces
│   │   ├── telegram/              # Telegram Bot implementation (grammY)
│   │   │   └── bot.ts             # Bot commands (/start, /jobs, /human, /link)
│   │   ├── speech/                # Speech Service adapter (IR-2)
│   │   │   ├── types.ts           # Unified STT & TTS interfaces
│   │   │   └── service.ts         # Provider wrapper (browser speech fallback)
│   │   ├── db/                    # Database, migrations, and Supabase client
│   │   │   ├── schema.sql         # PostgreSQL schema (all 16 entities + RLS)
│   │   │   └── supabase.ts        # Supabase client wrapper
│   │   ├── jobs/                  # Background schedulers
│   │   │   └── alert-scheduler.ts # Job alerts matching & delivery tracking
│   │   └── server.ts              # Express API & Telegram Webhook server
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                      # Accessible Next.js 16 Web Application
│   ├── public/                    # Static assets & Savanna HTML templates
│   │   ├── pages/                 # Savanna static pages served at root
│   │   └── assets/                # CSS and procedural earcon sound assets
│   ├── savanna/                   # Authentic ALX Savanna repository assets
│   │   ├── pages/                 # Original HTML templates
│   │   └── assets/                # Original Savanna CSS, vendor JS, images
│   ├── src/
│   │   ├── app/                   # Next.js 16 App Router (SRS v2.0)
│   │   │   ├── page.tsx           # Home & Savanna Hub
│   │   │   ├── register/          # Spoken form-filling & registration (FR-2)
│   │   │   ├── courses/           # Voice course choice & compare (FR-3)
│   │   │   ├── payment/           # Human-assisted payment page (FR-4)
│   │   │   ├── learn/             # Learning platform & voice quizzes (FR-5)
│   │   │   ├── profile/           # Profile & Telegram linking code (FR-6)
│   │   │   ├── staff/help-queue/  # Accessible Human Helper Queue (FR-9, FR-10)
│   │   │   ├── savanna/           # Savanna portal embedded viewer
│   │   │   └── api/               # API route proxies (chat, help-request)
│   │   ├── components/            # Reusable UI components
│   │   │   ├── assistant/         # WebAssistantPanel (persistent floating widget)
│   │   │   ├── a11y/              # Accessibility toolbar, LiveAnnouncer, SkipLink
│   │   │   └── navigation/        # AccessibleHeader & breadcrumbs
│   │   ├── core/                  # A11y context, earcons synthesizer, audio engine
│   │   └── types/                 # TypeScript interfaces for SRS v2.0 entities
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── README.md                      # Root documentation
```

---

## 2. Team Split (SRS Section 8.4)

| Member | Focus Area | Deliverables |
|---|---|---|
| **1. Frontend & Accessibility** | Pages, assistant panel, forms, learning platform UI | Accessible pages (`/register`, `/courses`, `/payment`, `/learn`, `/profile`), floating Web Assistant panel, Savanna bridge, WCAG 2.2 AA testing with screen readers. |
| **2. Backend & Data** | Database schema, auth, RLS, help pipeline, scheduler | `schema.sql` (all 16 entities), Supabase RLS policies, Realtime help request queue, job alert scheduler. |
| **3. AI & Speech** | Assistant core, Gemini API, RAG, allowed actions, Telegram bot | `assistant-core` (prompts, RAG retrieval via pgvector, allowed actions validation), grammY Telegram bot (`/jobs`, `/human`, `/link`), speech interfaces. |
| **4. Co-Design, Content & QA** | Co-designer testing, knowledge base, question test sets | 8–12 BVI co-designer evaluation sessions, course transcripts, verified knowledge chunks, 50–100 question benchmark test sets. |

---

## 3. Quick Start Guide

### Step 1: Clone and Setup Environment
```bash
git clone https://github.com/tsionbirhanu/ableway.git
cd ableway
```

### Step 2: Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### Step 3: Run Backend & Telegram Bot
```bash
cd ../backend
npm install
# Copy environment variables
cp .env.example .env
# Start the API server
npm run dev
# Or run the Telegram bot in development polling mode:
npm run bot:dev
```

---

## 4. Key SRS v2.0 Features & Testing Shortcuts

- **Web Assistant Activation**: Press <kbd>Alt + V</kbd> or <kbd>Alt + A</kbd> anywhere, or click the floating **Ableway Assistant** button on the bottom right.
- **Voice Commands**:
  - *"Help"* — Lists available actions
  - *"Where am I"* — Spoken orientation announcement
  - *"Call human"* — Immediately dispatches a ticket to the Human Helper Queue
  - *"Go to courses"* / *"Go to payment"* — Automatic voice navigation
  - *"My name is [Name]"* — Fills the registration field and reads it back
- **Human-Assisted Payment**: Go to `/payment` and click *"Request Human Payment Helper"*. Open `/staff/help-queue` in another tab to view the live ticket, accept it, initiate helper takeover, and confirm payment to unlock the course.
- **Telegram Linking**: Go to `/profile`, click *"Generate One-Time Linking Code"*, and submit `/link <code>` to `@AblewayBot`.
- **Authentic Savanna Pages**: Accessible under `/savanna` or directly at `/pages/homepage-v1-paced.html`.

