# Ableway Frontend

The accessible, voice-first learning platform for visually impaired students, integrated into the authentic ALX Savanna portal design. Built to comply with **WCAG 2.2 Level AA** standards.

---

## Quick Start for Team Members

When you pull this repository for the first time:

### 1. Prerequisites
- **Node.js**: `v18.18.0` or higher (`v20.x` or `v22.x` recommended)
- **Package Manager**: `npm` (v9+) or `pnpm` / `yarn`
- **Supported Browsers for Voice**: Google Chrome or Microsoft Edge (recommended for Web Speech API recognition support)

### 2. Install Dependencies

Navigate into the `frontend` directory and install all required packages:

```bash
cd frontend
npm install
```

> **Note**: If you ever encounter React 19 peer-dependency warnings with newly added third-party packages, run:
> ```bash
> npm install --legacy-peer-deps
> ```

### 3. Configure Environment Variables (Optional)

Create a `.env.local` file in the `frontend` root:

```bash
cp .env.example .env.local 2> /dev/null || touch .env.local
```

Add your Supabase credentials (if connecting to backend auth/database):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

*(The frontend will automatically operate with local fallback state if Supabase keys are omitted during initial development).*

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles and optimizes the production build |
| `npm run build -- --webpack` | Production build using Webpack (recommended on Windows if Turbopack pipe timeout occurs) |
| `npm run start` | Runs the compiled production server |
| `npm run lint` | Runs Next.js ESLint checks |

---

## Package Dependencies Overview

All dependencies are defined in [`package.json`](./package.json). Here is what each package does:

### Core Framework
| Package | Version | Purpose |
|---|---|---|
| `next` | `16.4.6` | Next.js App Router framework (SSR, SSG, routing) |
| `react` & `react-dom` | `19.3.0` | React 19 UI component library |
| `typescript` | `^5` | Strict static typing across components, hooks, and services |

### Accessibility & UI Primitives (Radix UI)
| Package | Version | Purpose |
|---|---|---|
| `@radix-ui/react-dialog` | `^1.3.1` | Accessible modal dialog with focus trapping (used for Socratic AI Tutor) |
| `@radix-ui/react-dropdown-menu` | `^2.2.1` | Accessible dropdown menus with full keyboard navigation |
| `@radix-ui/react-slider` | `^1.6.1` | Accessible slider controls (speech rate, pitch, audio volume) |
| `@radix-ui/react-switch` | `^1.4.1` | Accessible toggle switches (Voice Mode, Audio Cues, Screen Reader Mode) |
| `@radix-ui/react-tabs` | `^1.2.1` | Accessible WAI-ARIA tabbed panels for curriculum views |
| `@radix-ui/react-accessible-icon` | `^1.2.0` | Enforces screen-reader labels for visual-only icons |
| `lucide-react` | `^1.72.0` | Accessible SVG icon suite |

### Audio & Interaction
| Package | Version | Purpose |
|---|---|---|
| `howler` & `@types/howler` | `^2.2.4` | Audio engine for earcon sound cues (start listening, success, error, navigation) |
| `react-hotkeys-hook` | `^5.4.0` | Global accessible keyboard hotkeys (`Alt+V`, `Alt+H`, `Alt+T`, `Escape`) |
| *Native Web Speech API* | — | Browser speech recognition (`webkitSpeechRecognition`) & speech synthesis (`speechSynthesis`) |
| *Native Web Audio API* | — | Real-time procedural audio synthesis for tactile earcon sound cues |

### Backend / Auth Client
| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.119.0` | Supabase JavaScript client for authentication, profiles, progress tracking |
| `@supabase/ssr` | `^0.12.7` | Server-side cookie-based auth utilities for Next.js App Router |

### Styling & Class Utilities
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | `4.3.3` | Utility-first styling framework |
| `@tailwindcss/turbopack` | `4.3.3` | Fast Turbopack Tailwind compilation |
| `clsx` & `tailwind-merge` | `^2.1.1` / `^3.7.0` | Safe conditional class merging without Tailwind utility conflicts |

### Dev & Accessibility Auditing
| Package | Version | Purpose |
|---|---|---|
| `@axe-core/react` | `^4.14.0` | Real-time WCAG 2.2 AA accessibility violations auditor in the browser console during development |
| `eslint` & `eslint-config-next` | `^9` / `16.4.6` | Code quality and React/Next.js lint rules |

---

## Directory Structure

```
frontend/
├── public/                     # Static assets served at root
│   ├── assets/                 # Shared CSS, JS, and sound assets
│   │   ├── css/ableway-voice-a11y.css
│   │   └── js/ableway-voice-a11y.js
│   ├── pages/                  # Savanna static HTML pages (synced for Next.js)
│   │   ├── homepage-v1-paced.html
│   │   ├── homepage-v1-self-paced.html
│   │   └── concept-with-navigation.html
│   └── savanna/                # Mirrored Savanna portal assets
├── savanna/                    # Original ALX Savanna repository assets
│   ├── assets/                 # Original CSS, vendor JS, images
│   └── pages/                  # Savanna static HTML templates with Ableway integration
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── layout.tsx          # Root layout with accessibility providers & live announcer
│   │   ├── page.tsx            # Savanna portal launchpad & interactive preview
│   │   ├── tutor/              # Socratic AI Tutor dedicated page
│   │   └── globals.css         # Tailwind v4 theme & high-contrast styling tokens
│   ├── components/             # Reusable UI components
│   │   ├── a11y/               # Accessible toolbar, live region, screen-reader components
│   │   ├── tutor/              # Socratic Tutor dialog & spoken interactions
│   │   └── navigation/         # Accessible navigation & header
│   ├── context/
│   │   └── a11y-context.tsx    # Global accessibility context (contrast, font size, voice mode)
│   ├── hooks/                  # Custom React hooks (voice recognition, earcons, keyboard)
│   └── lib/                    # Supabase client & procedural audio synthesis utilities
├── package.json
└── tsconfig.json
```

---

## Key Accessibility Features to Test

1. **Voice-First Navigation (`Alt+V`)**:
   - Turn on microphone access. Say `"Help"` for spoken command list.
   - Say `"Week 1"`, `"Next week"`, `"Where am I"`, `"How am I doing"`, or `"Ask tutor"`.
2. **Audio Earcons**:
   - Audio earcon chimes sound on recognition start (chime), command match (double chime), navigation (chord), and errors (low chime).
3. **Socratic AI Tutor (`Alt+T`)**:
   - Open dialog with hotkey `Alt+T` or voice command `"Ask tutor"`.
   - Offers hints and conversational guidance without giving away direct answers.
4. **Dual Accessibility Modes**:
   - **Voice-First Mode**: Provides full spoken speech synthesis for visually impaired users without screen readers.
   - **Screen Reader Mode**: Silences in-app TTS and routes all announcements through `aria-live="polite"` regions so NVDA, JAWS, or VoiceOver don't experience conflicting double-talk.
5. **High-Contrast Themes**:
   - Standard, High Contrast, Pure Black (OLED), and Yellow-on-Black (maximum readability).

---

## Contributing

1. Pull the latest `main` branch before starting work:
   ```bash
   git pull origin main
   ```
2. Run type checking before opening a PR:
   ```bash
   npx tsc --noEmit
   ```
3. Test your code against the accessibility audit using browser DevTools console (powered by `@axe-core/react`).