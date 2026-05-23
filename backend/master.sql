-- =============================================================================
-- BLCK.BLOG — Supabase Schema
-- Run this in the Supabase SQL Editor to bootstrap the database.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES TABLE ───────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Anonymous'),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only the auth trigger should invoke this — block direct RPC calls
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── POSTS TABLE ──────────────────────────────────────────────────────────────

CREATE TABLE posts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Uncategorized',
  excerpt    TEXT,
  body       TEXT NOT NULL,
  date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing posts sorted by date
CREATE INDEX idx_posts_date ON posts (date DESC);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

INSERT INTO posts (title, category, excerpt, body, date) VALUES
(
  'The Architecture of Thought',
  'Design',
  'How structured thinking parallels industrial design — precision, repeatability, and clarity as cognitive tools.',
  'In the same way an engineer designs a system with no tolerance for ambiguity, we can approach ideas as modular, testable, and composable units. The industrialized mind doesn''t leave room for entropy — it plans, measures, and iterates with discipline.\n\nThis is not rigidity. It is clarity. When you remove the noise, what remains is signal. A thought reduced to its essential components becomes universal, scalable, replicable.\n\nConsider how the Swiss grid system revolutionized typography. Not by eliminating creativity, but by giving it structure. Alignment is not a constraint — it is a foundation.',
  '2026-04-12'
),
(
  'Bold Systems Over Soft Choices',
  'Strategy',
  'Why committing to a strong aesthetic or process always outperforms cautious, hedged decisions.',
  'Soft design is forgettable. Hedged strategy is indistinguishable. When you try to please everyone, you surprise no one.\n\nThe most resilient systems — architectural, industrial, typographic — share a trait: they commit. A primary color used boldly is more powerful than ten pastels used timidly. A single sans-serif typeface used with precision beats five fonts used haphazardly.\n\nThis applies to organizations, too. A company with a narrow, precise positioning cuts through markets. A company that tries to be everything becomes background noise.',
  '2026-05-01'
),
(
  'Lines, Not Curves',
  'Aesthetics',
  'A case for straight lines in design — the geometry of certainty in an uncertain world.',
  'Curves seduce. Lines declare.\n\nThe straight line is the fastest route between two points. It implies intent. It suggests a mind that knows where it is going. In architecture, in typography, in product design — the line communicates discipline.\n\nNot every design needs to be soft. Not every edge needs rounding. There is a kind of beauty in the orthogonal that the curved form can never achieve: the beauty of a decision made completely.',
  '2026-05-18'
);
