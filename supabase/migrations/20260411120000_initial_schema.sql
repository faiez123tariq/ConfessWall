-- Anonymous Confession Wall — initial schema (design.md §9)
-- Run once in Supabase: Dashboard → SQL → New query → Run
-- Or: `supabase db push` if you use Supabase CLI linked to this project

-- Extensions (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT attendees_session_email_unique UNIQUE (session_id, email)
);

CREATE TABLE confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) <= 200),
  chaos_score INTEGER CHECK (chaos_score IS NULL OR chaos_score BETWEEN 1 AND 10),
  ai_roast TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (confession_id, attendee_id)
);

-- Realtime: send full row on UPDATE (needed for chaos_score / ai_roast updates)
ALTER TABLE confessions REPLICA IDENTITY FULL;

-- Enable Realtime (design.md)
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE upvotes;
ALTER PUBLICATION supabase_realtime ADD TABLE attendees;
