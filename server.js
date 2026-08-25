require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const postsService = require('./backend/posts');
const auth = require('./backend/auth');
const likesService = require('./backend/likes');
const CATEGORIES = require('./backend/categories');

const app = express();
const PORT = 3000;

// Engine & middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.svg')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'blck-blog-dev-secret',
  resave: false,
  saveUninitialized: false,
}));

// Make session user and categories available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.categories = CATEGORIES;
  next();
});

// Helpers
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

// ─── Auth Routes ────────────────────────────────────────────────────────────────

// Login form
app.get('/auth/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { error: null });
});

// Login action
app.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.render('auth/login', { error: 'Email and password are required.' });
    }
    const user = await auth.signIn(email, password);
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    res.render('auth/login', { error: 'Invalid email or password.' });
  }
});

// Signup form
app.get('/auth/signup', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/signup', { error: null, message: null });
});

// Signup action
app.post('/auth/signup', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email?.trim() || !password) {
      return res.render('auth/signup', { error: 'Email and password are required.', message: null });
    }
    const user = await auth.signUp(email, password, displayName);
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    const msg = err.message || 'Signup failed. Try a different email.';
    res.render('auth/signup', { error: msg, message: null });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ─── Blog Routes ────────────────────────────────────────────────────────────────

// Home — all posts
app.get('/', async (req, res) => {
  let posts = [];
  let recommended = [];
  let warning = null;
  try {
    posts = await postsService.getAll();
  } catch (err) {
    console.error('Failed to load posts:', err.message);
    warning = 'Unable to load posts — backend may be unavailable.';
  }
  try {
    if (req.session.user) {
      recommended = await likesService.getRecommended(req.session.user.id);
    }
  } catch (_) {}
  res.render('index', { posts, formatDate, recommended, warning });
});

// New post form
app.get('/posts/new', auth.requireAuth, (req, res) => {
  res.render('new', { error: null });
});

// Create post
app.post('/posts', auth.requireAuth, async (req, res) => {
  const { title, category, excerpt, body } = req.body;
  if (!title?.trim() || !body?.trim()) {
    return res.render('new', { error: 'Title and body are required.', warning: null });
  }
  try {
    const post = await postsService.create({
      title, category, excerpt, body,
      authorId: req.session.user.id,
    });
    return res.redirect(`/posts/${post.id}`);
  } catch (err) {
    console.error('Failed to save post:', err.message);
    const post = {
      id: 'unsaved-' + Date.now(),
      author_id: req.session.user.id,
      author_name: req.session.user.displayName || null,
      title: title.trim(),
      category: category?.trim() || 'Uncategorized',
      excerpt: excerpt?.trim() || stripHtml(body).trim().slice(0, 120) + '…',
      body: body.trim(),
      date: new Date().toISOString(),
      readTime: `${Math.max(1, Math.ceil(stripHtml(body).trim().split(/\s+/).length / 200))} min`,
    };
    return res.render('post', {
      post, others: [], formatDate,
      canEdit: false, canDelete: false,
      likeCount: 0, userLiked: false,
      warning: 'Failed to save — your post is displayed locally but not persisted.',
    });
  }
});

// View single post
app.get('/posts/:id', async (req, res) => {
  let post;
  try {
    post = await postsService.getById(req.params.id);
  } catch (err) {
    console.error('Failed to load post:', err.message);
    return res.status(503).render('404', { warning: 'Unable to load post — backend may be unavailable.' });
  }
  if (!post) return res.status(404).render('404', { warning: null });
  let others = [];
  let likeCount = 0;
  let userLiked = false;
  try {
    const all = await postsService.getAll();
    others = all.filter(p => p.id !== post.id).slice(0, 2);
  } catch (_) {}
  try {
    likeCount = await likesService.getCount(post.id);
  } catch (_) {}
  const user = req.session.user;
  try {
    if (user) userLiked = await likesService.isLiked(post.id, user.id);
  } catch (_) {}
  res.render('post', {
    post, others, formatDate,
    canEdit: auth.canEditPost(post, user),
    canDelete: auth.canDeletePost(post, user),
    likeCount, userLiked,
  });
});

// Edit form
app.get('/posts/:id/edit', auth.requireAuth, async (req, res) => {
  let post;
  try {
    post = await postsService.getById(req.params.id);
  } catch (err) {
    console.error('Failed to load post for edit:', err.message);
    return res.status(503).render('404', { warning: 'Unable to load post — backend may be unavailable.' });
  }
  if (!post) return res.status(404).render('404', { warning: null });
  if (!auth.canEditPost(post, req.session.user)) {
    return res.status(403).render('403');
  }
  res.render('edit', { post, error: null });
});

// Update post
app.post('/posts/:id/edit', auth.requireAuth, async (req, res) => {
  let post;
  try {
    post = await postsService.getById(req.params.id);
  } catch (err) {
    console.error('Failed to load post for update:', err.message);
    return res.status(503).render('404', { warning: 'Unable to load post — backend may be unavailable.' });
  }
  if (!post) return res.status(404).render('404', { warning: null });
  if (!auth.canEditPost(post, req.session.user)) {
    return res.status(403).render('403');
  }
  const { title, category, excerpt, body } = req.body;
  if (!title?.trim() || !body?.trim()) {
    return res.render('edit', { post, error: 'Title and body are required.' });
  }
  try {
    await postsService.update(req.params.id, { title, category, excerpt, body });
    res.redirect(`/posts/${req.params.id}`);
  } catch (err) {
    console.error('Failed to update post:', err.message);
    return res.status(503).render('404', { warning: 'Failed to save changes — backend may be unavailable.' });
  }
});

// Delete post
app.post('/posts/:id/delete', auth.requireAuth, async (req, res) => {
  let post;
  try {
    post = await postsService.getById(req.params.id);
  } catch (err) {
    console.error('Failed to load post for delete:', err.message);
    return res.status(503).render('404', { warning: 'Unable to load post — backend may be unavailable.' });
  }
  if (!post) return res.status(404).render('404', { warning: null });
  if (!auth.canDeletePost(post, req.session.user)) {
    return res.status(403).render('403');
  }
  try {
    await postsService.remove(req.params.id);
    res.redirect('/');
  } catch (err) {
    console.error('Failed to delete post:', err.message);
    return res.status(503).render('404', { warning: 'Failed to delete — backend may be unavailable.' });
  }
});

// Like / unlike a post
app.post('/posts/:id/like', auth.requireAuth, async (req, res, next) => {
  try {
    const result = await likesService.toggle(req.params.id, req.session.user.id);
    const count = await likesService.getCount(req.params.id);
    res.json({ liked: result.liked, count });
  } catch (err) { next(err); }
});

// Profile — list posts by a specific author
app.get('/profile/:id', async (req, res) => {
  let profile;
  try {
    profile = await auth.getProfile(req.params.id);
  } catch (err) {
    console.error('Failed to load profile:', err.message);
    return res.status(503).render('404', { warning: 'Unable to load profile — backend may be unavailable.' });
  }
  if (!profile) return res.status(404).render('404', { warning: null });
  let posts = [];
  let warning = null;
  try {
    posts = await postsService.getByAuthor(req.params.id);
  } catch (err) {
    console.error('Failed to load author posts:', err.message);
    warning = 'Unable to load posts — backend may be unavailable.';
  }
  const user = req.session.user;
  res.render('profile', {
    profile, posts, formatDate, warning,
    isOwner: user && user.id === profile.id,
    currentUser: user,
  });
});

// 404 fallback
app.use((req, res) => res.status(404).render('404', { warning: null }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('404', { warning: 'Something went wrong — the server encountered an error.' });
});

app.listen(PORT, () => console.log(`BLCK.BLOG running → http://localhost:${PORT}`));
