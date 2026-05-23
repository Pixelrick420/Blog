const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey   = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.');
  process.exit(1);
}

// Secret-key client — bypasses RLS, used for server-side DB operations
const supabase = createClient(supabaseUrl, secretKey);

// Publishable-key client — used for auth flows on the server (sign-up, sign-in, etc.)
const supabasePublishable = publishableKey
  ? createClient(supabaseUrl, publishableKey)
  : supabase;

module.exports = { supabase, supabasePublishable };
