-- =============================================================================
-- BLCK.BLOG — Full Database Reset
-- Run this in the Supabase SQL Editor to tear down everything master.sql creates.
-- After running this, you can re-run master.sql cleanly.
-- =============================================================================

-- Drop triggers (order matters: triggers before functions/tables)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS posts_updated_at ON posts;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();

-- Drop indexes (automatic with table drop, but explicit for clarity)
DROP INDEX IF EXISTS idx_posts_date;

-- Drop tables (order: likes references posts+profiles, posts references profiles)
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS profiles;

-- Optional: remove the extension if no other project objects depend on it
-- DROP EXTENSION IF EXISTS "uuid-ossp";
