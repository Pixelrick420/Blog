const { supabase, supabasePublishable } = require('./supabase');

// ─── Sign Up (email/password) ──────────────────────────────────────────────────

async function signUp(email, password, displayName) {
  const { data, error } = await supabasePublishable.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split('@')[0] } },
  });
  if (error) throw error;

  const finalDisplayName = displayName || email.split('@')[0];

  // Wait for the DB trigger to create the profile row
  await new Promise(r => setTimeout(r, 500));

  // The trigger may have used the email local-part instead of the
  // user's chosen display name — overwrite with the correct value.
  await supabase
    .from('profiles')
    .update({ display_name: finalDisplayName })
    .eq('id', data.user.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role || 'user',
    displayName: profile?.display_name || finalDisplayName,
  };
}

// ─── Sign In (email/password) ──────────────────────────────────────────────────

async function signIn(email, password) {
  const { data, error } = await supabasePublishable.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile) {
    // Create missing profile
    const displayName = data.user.user_metadata?.display_name || email.split('@')[0];
    await supabase.from('profiles').insert({ id: data.user.id, display_name: displayName });
    profile = { id: data.user.id, display_name: displayName, role: 'user' };
  } else {
    // Fix profiles where the trigger stored the email local-part instead
    // of the user's chosen display name (affects existing users).
    const emailLocal = email.split('@')[0];
    if (profile.display_name === emailLocal || profile.display_name === 'Anonymous') {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(data.user.id);
        const metaName = user?.user_metadata?.display_name;
        if (metaName && metaName !== profile.display_name) {
          await supabase.from('profiles').update({ display_name: metaName }).eq('id', data.user.id);
          profile.display_name = metaName;
        }
      } catch (_) {
        // Admin API may be unavailable; keep the current name
      }
    }
  }

  return {
    id: data.user.id,
    email: data.user.email,
    role: profile?.role || 'user',
    displayName: profile?.display_name || email.split('@')[0],
  };
}

// ─── Profile ───────────────────────────────────────────────────────────────────

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data) return data;

  // Profile doesn't exist — try to create it from auth user metadata
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (!user) return null;
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous';
    await supabase.from('profiles').insert({ id: userId, display_name: displayName });
    return { id: userId, display_name: displayName, role: 'user', created_at: new Date().toISOString() };
  } catch (_) {
    return null;
  }
}

// ─── Authorization Helpers ─────────────────────────────────────────────────────

function canEditPost(post, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return post.author_id === user.id;
}

function canDeletePost(post, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return post.author_id === user.id;
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
  getProfile,
  canEditPost,
  canDeletePost,
  requireAuth,
  requireAdmin,
};
