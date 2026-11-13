-- Enable pgvector for knowledge_chunks.embedding.
-- Neon supports this extension on all plans.
CREATE EXTENSION IF NOT EXISTS vector;
