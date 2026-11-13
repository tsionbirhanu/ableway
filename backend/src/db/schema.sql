-- =========================================================================
-- ABLEWAY PLATFORM - DATABASE SCHEMA (SRS v2.0)
-- PostgreSQL with pgvector, Row-Level Security (RLS), and Realtime Queues
-- =========================================================================

-- Enable pgvector extension for AI Knowledge Base RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Learners, Helpers, Administrators)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  role TEXT NOT NULL CHECK (role IN ('learner', 'helper', 'admin', 'codesigner')) DEFAULT 'learner',
  accessibility_settings JSONB NOT NULL DEFAULT '{
    "mode": "voice_first",
    "theme": "standard",
    "font_size": "medium",
    "speech_rate": 1.0,
    "speech_pitch": 1.0,
    "audio_cues_enabled": true,
    "screen_reader_friendly": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'ETB',
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MODULES
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LESSONS
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  transcript TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 1,
  has_human_image_descriptions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'pending_verification', 'confirmed')) DEFAULT 'unpaid',
  progress JSONB NOT NULL DEFAULT '{"completed_lessons": [], "quiz_scores": {}, "current_lesson_id": null}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(learner_id, course_id)
);

-- 7. HELP REQUESTS (Core Human-in-the-Loop Pipeline)
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'general', 'technical', 'telegram', 'urgent')) DEFAULT 'general',
  trigger TEXT NOT NULL CHECK (trigger IN ('learner', 'assistant')) DEFAULT 'learner',
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'assigned', 'in_progress', 'done')) DEFAULT 'waiting',
  assigned_helper_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'telegram', 'phone', 'sms')) DEFAULT 'web',
  contact_preference TEXT NOT NULL DEFAULT 'web_chat',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PAYMENT RECORDS (Confirmed by human helpers, NO card details)
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ETB',
  method TEXT NOT NULL DEFAULT 'telebirr_or_cbe',
  reference_code TEXT,
  confirmed_by UUID NOT NULL REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TELEGRAM LINKS (Account linking with temporary one-time code)
CREATE TABLE IF NOT EXISTS telegram_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  link_code TEXT UNIQUE,
  code_expires_at TIMESTAMPTZ,
  language TEXT NOT NULL DEFAULT 'en',
  consent BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'telegram')) DEFAULT 'web',
  status TEXT NOT NULL CHECK (status IN ('assistant_active', 'helper_takeover', 'closed')) DEFAULT 'assistant_active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('learner', 'assistant', 'helper', 'system')),
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. JOBS
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  employer TEXT NOT NULL,
  location TEXT NOT NULL,
  requirements TEXT NOT NULL,
  how_to_apply TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  accessibility_notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ALERT SUBSCRIPTIONS & DELIVERIES
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keywords TEXT[] DEFAULT '{}',
  location TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'sms')) DEFAULT 'telegram',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed')) DEFAULT 'delivered',
  UNIQUE(subscription_id, job_id)
);

-- 13. KNOWLEDGE CHUNKS (For Gemini RAG Grounding via pgvector)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('platform', 'course', 'payment', 'telegram', 'job', 'help')),
  language TEXT NOT NULL DEFAULT 'en',
  text TEXT NOT NULL,
  embedding vector(768),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. UNANSWERED QUESTIONS (For continuous knowledge improvement)
CREATE TABLE IF NOT EXISTS unanswered_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  channel TEXT NOT NULL CHECK (channel IN ('web', 'telegram')),
  escalated BOOLEAN NOT NULL DEFAULT true,
  resolved BOOLEAN NOT NULL DEFAULT false,
  added_to_knowledge_base BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;

-- Learners can read and update their own profile
CREATE POLICY "Learners view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Learners update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Helpers and admins can view learner profiles
CREATE POLICY "Staff view profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('helper', 'admin'))
  );

-- Help Requests: Learners see own, Helpers see queue
CREATE POLICY "Learners see own help requests" ON help_requests
  FOR SELECT USING (learner_id = auth.uid());

CREATE POLICY "Learners create help requests" ON help_requests
  FOR INSERT WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Helpers view and update all help requests" ON help_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('helper', 'admin'))
  );

-- Courses and Jobs are public to view for all authenticated/anonymous users
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are readable by everyone" ON courses
  FOR SELECT USING (status = 'published');

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published jobs are readable by everyone" ON jobs
  FOR SELECT USING (status = 'published');

