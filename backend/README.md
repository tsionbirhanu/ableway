# Ableway Backend

The shared backend service powering the **Web Assistant**, **Telegram Bot (grammY)**, **Human Helper Queue**, and **pgvector RAG Knowledge Base** for the Ableway platform, built to the specifications in **SRS v2.0**.

---

## Architecture Overview

```
backend/
├── src/
│   ├── assistant-core/       # One shared assistant core for Web & Telegram
│   │   ├── core.ts           # Core processing pipeline & function caller
│   │   ├── actions.ts        # Allowed actions definition & server validation
│   │   ├── prompts.ts        # Multilingual prompts & strict scope grounding
│   │   ├── rag.ts            # pgvector semantic retrieval & fallback knowledge
│   │   ├── safety.ts         # Distress detection, prompt-injection defense
│   │   └── types.ts          # Core types and interfaces
│   ├── telegram/             # Telegram Bot implementation (grammY)
│   │   └── bot.ts            # Bot commands (/start, /jobs, /alerts, /human, /link)
│   ├── speech/               # Speech Services behind unified interface (IR-2)
│   │   ├── types.ts          # STT and TTS interfaces
│   │   └── service.ts        # Provider adapter (Whisper / ElevenLabs / fallback)
│   ├── db/                   # Database & Supabase connection
│   │   ├── schema.sql        # PostgreSQL schema with pgvector & RLS policies
│   │   └── supabase.ts       # Supabase client wrapper
│   ├── jobs/                 # Background schedulers
│   │   └── alert-scheduler.ts # Job alerts matching & delivery tracker
│   └── server.ts             # Express HTTP API & Telegram Webhook server
├── package.json
└── tsconfig.json
```

---

## Setup & Running

### 1. Prerequisites
- Node.js `v18.18.0` or higher
- Supabase account or local PostgreSQL instance with `pgvector` enabled

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `TELEGRAM_BOT_TOKEN`.

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Telegram Bot in Polling Mode (for local testing)
```bash
npm run bot:dev
```
