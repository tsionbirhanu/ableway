# Ableway Frontend (SRS v2.0)

The accessible Next.js 16 web application for the Ableway platform, designed for blind and visually impaired learners and integrated with the authentic ALX Savanna curriculum portal.

---

## 1. Quick Start for Team Members

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 2. Structure & Routes (SRS v2.0)

| Route | Purpose | SRS Requirement |
|---|---|---|
| `/` | Savanna & Ableway Hub | Gateway to learner journey & Savanna portal |
| `/register` | Spoken Form Registration | FR-2.1 to FR-2.8: Voice-filled form, letter-by-letter spelling, no CAPTCHA |
| `/courses` | Course Choice & Recommendations | FR-3.1 to FR-3.4: Course listing, audio descriptions, goal matching |
| `/payment` | Safe Human-Assisted Payment | FR-4.1 to FR-4.10: One-click human assistance, live ticket tracker |
| `/learn` | Accessible Learning Platform | FR-5.1 to FR-5.8: Audio player + transcripts, rewind/speed, voice quizzes |
| `/profile` | Profile & Telegram Linking | FR-6.1 to FR-6.6: A11y preferences, 6-digit one-time code for Telegram bot |
| `/staff/help-queue` | Human Helper Queue | FR-9.1 to FR-9.3, FR-10.4 to FR-10.8: Real-time ticket queue, live takeover |
| `/savanna` | Embedded Savanna Portal | Preserved authentic ALX Savanna curriculum pages |
| `/api/assistant/chat` | Assistant API Proxy | Forwards conversation to Assistant Core or local fallback |
| `/api/help-request` | Help Request Proxy | Records incoming tickets for staff queue |

---

## 3. Preserved Savanna Pages

The authentic ALX Savanna static pages remain untouched in:
- `savanna/pages/homepage-v1-paced.html`
- `savanna/pages/homepage-v1-self-paced.html`
- `savanna/pages/concept-with-navigation.html`
- `savanna/assets/`

Served statically via Next.js at `/pages/...` and accessible interactively via `/savanna`.

---

## 4. Key Scripts

```bash
npm run dev          # Start development server
npm run build        # Build production application
npm run build -- --webpack # Recommended build command on Windows
npm start            # Run production server
npm run lint         # Check ESLint rules
```
