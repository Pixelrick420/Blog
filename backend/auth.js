const { supabase, supabasePublishable } = require('./supabase');

// ─── Sign Up (email/password) ──────────────────────────────────────────────────

async function signUp(email, password, displayName) {
  const { data, error } = await supabasePublishable.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split('@')[0] } },
  });
  if (error) throw error;

  // Profile is created by the DB trigger on auth.users insert.
  // Wait a moment for the trigger to fire, then fetch it.
  await new Promise(r => setTimeout(r, 500));
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role || 'user',
    displayName: profile?.display_name || displayName || email.split('@')[0],
  };
}

// ─── Sign In (email/password) ──────────────────────────────────────────────────

async function signIn(email, password) {
  const { data, error } = await supabasePublishable.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role || 'user',
    displayName: profile?.display_name || email.split('@')[0],
  };
}

// ─── Authorization Helpers ─────────────────────────────────────────────────────

function canEditPost(post, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return post.author_id === user.id;
}

function canDeletePost(user) {
  return user?.role === 'admin';
}

// ─── Express Middleware ────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  if (req.session.user.role !== 'admin') return res.status(403).render('403');
  next();
}

module.exports = {
  signUp,
  signIn,
  canEditPost,
  canDeletePost,
  requireAuth,
  requireAdmin,
};
