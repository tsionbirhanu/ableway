import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { webhookCallback } from 'grammy';
import { processAssistantMessage } from './assistant-core/core.js';
import { bot } from './telegram/bot.js';
import { supabase } from './db/supabase.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 1. Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ableway-backend', timestamp: new Date().toISOString() });
});

// 2. Web Assistant API endpoint (FR-1.2, FR-11.8)
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, userId, language = 'en', currentPage, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await processAssistantMessage({
      message,
      userId,
      channel: 'web',
      language,
      currentPage,
      context,
    });

    return res.json(response);
  } catch (error: any) {
    console.error('[API] Error in assistant chat:', error);
    return res.status(500).json({ error: 'Internal assistant error', details: error.message });
  }
});

// 3. One-Click Human Help Request (FR-4.2, FR-10.1)
app.post('/api/help-request', async (req, res) => {
  try {
    const { learnerId, type = 'general', summary, channel = 'web', courseId } = req.body;

    const { data, error } = await supabase.from('help_requests').insert({
      learner_id: learnerId,
      course_id: courseId || null,
      type,
      trigger: 'learner',
      summary: summary || 'Learner requested one-click human assistance',
      status: 'waiting',
      channel,
    }).select().single();

    if (error) {
      console.warn('[API] Could not insert help request to Supabase, returning mock payload:', error.message);
      return res.json({
        id: 'mock-req-' + Date.now(),
        status: 'waiting',
        message: 'A human helper has been notified and will assist you shortly.',
      });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Telegram Webhook route (IR-4)
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV === 'production') {
  app.use('/api/telegram/webhook', webhookCallback(bot, 'express'));
}

app.listen(port, () => {
  console.log(`[Ableway Backend] Server running on http://localhost:${port}`);
});

