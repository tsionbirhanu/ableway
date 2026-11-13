# lib/telegram

grammY bot integration for Ableway learners.
Receives webhook updates at `/api/telegram` with constant-time verification against `TELEGRAM_WEBHOOK_SECRET`.

## Features

- **Webhook endpoint (`app/api/telegram/route.ts`)**:
  - Verifies secret token header (`X-Telegram-Bot-Api-Secret-Token`) using `timingSafeEqual`.
  - Acknowledges quickly (`200 OK`) and processes slow tasks (speech transcription, Gemini calls) in the background.
  - Idempotent update handling deduplicated by `update_id`.
- **Account Linking (`lib/telegram/linking.ts`)**:
  - Learners generate a 10-minute one-time code on their web profile (`/profile`), stored as a SHA-256 hash in `link_codes`.
  - The learner sends the code to the bot (or uses `/start <code>`).
  - Upon redemption, records the link in `telegram_links` with explicit consent timestamp (`consent_at`).
  - `/unlink` removes the link and deactivates Telegram job alert subscriptions.
  - Unlinked users receive a polite message pointing to the website.
- **Commands & Plain Phrases (`lib/telegram/commands.ts`)**:
  - `/start`: Welcome message, language selection with inline buttons, list of capabilities, and clear statement of what the bot cannot do (cannot see other chats, cannot process payments directly).
  - `help`: Step-by-step guides from the knowledge base for sending messages, voice notes, joining channels, forwarding, and settings.
  - `language`: Inline keyboard to toggle between English and Amharic.
  - `jobs`: Lists verified accessible job openings (up to 5, plain sentences).
  - `alerts`: Displays current job alert status.
  - `human`: Creates a help request ticket (`help_requests`), mutes the bot while a helper is in charge, and relays helper messages into the chat.
  - `unlink`: Disconnects Telegram account and cancels alerts.
  - Every command functions both with a leading `/` and as a plain phrase.
- **Text, Voice & Untrusted Content (`lib/telegram/handlers.ts`)**:
  - Voice notes: Downloads voice file, transcribes it, queries `askAssistant` (`channel: "telegram"`), and responds with both voice and text.
  - Forwarded messages & files: Treated as untrusted data, summarized, and read aloud with voice and text.
  - Replies strictly adhere to accessibility constraints: plain language (grade 6 level), at most five numbered choices, and no decorative symbols.

## Development with a Tunnel

To connect Telegram to your local development server:

1. Start your local tunnel (e.g. Cloudflare tunnel or ngrok):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
2. Set the Telegram webhook to your tunnel URL:
   ```bash
   pnpm telegram:webhook set https://<your-subdomain>.trycloudflare.com
   ```
3. Check webhook status anytime:
   ```bash
   pnpm telegram:webhook get
   ```
4. Delete the webhook when done:
   ```bash
   pnpm telegram:webhook delete
   ```
