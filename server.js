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
app.get('/', async (req, res, next) => {
  try {
    const posts = await postsService.getAll();
    const recommended = req.session.user
      ? await likesService.getRecommended(req.session.user.id)
      : [];
    res.render('index', { posts, formatDate, recommended });
  } catch (err) { next(err); }
});

// New post form
app.get('/posts/new', auth.requireAuth, (req, res) => {
  res.render('new', { error: null });
});

// Create post
app.post('/posts', auth.requireAuth, async (req, res, next) => {
  try {
    const { title, category, excerpt, body } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.render('new', { error: 'Title and body are required.' });
    }
    const post = await postsService.create({
      title, category, excerpt, body,
      authorId: req.session.user.id,
    });
    res.redirect(`/posts/${post.id}`);
  } catch (err) { next(err); }
});

// View single post
app.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await postsService.getById(req.params.id);
    if (!post) return res.status(404).render('404');
    const all = await postsService.getAll();
    const others = all.filter(p => p.id !== post.id).slice(0, 2);
    const user = req.session.user;
    const likeCount = await likesService.getCount(post.id);
    const userLiked = user ? await likesService.isLiked(post.id, user.id) : false;
    res.render('post', {
      post, others, formatDate,
      canEdit: auth.canEditPost(post, user),
      canDelete: auth.canDeletePost(post, user),
      likeCount, userLiked,
    });
  } catch (err) { next(err); }
});

// Edit form
app.get('/posts/:id/edit', auth.requireAuth, async (req, res, next) => {
  try {
    const post = await postsService.getById(req.params.id);
    if (!post) return res.status(404).render('404');
    if (!auth.canEditPost(post, req.session.user)) {
      return res.status(403).render('403');
    }
    res.render('edit', { post, error: null });
  } catch (err) { next(err); }
});

// Update post
app.post('/posts/:id/edit', auth.requireAuth, async (req, res, next) => {
  try {
    const post = await postsService.getById(req.params.id);
    if (!post) return res.status(404).render('404');
    if (!auth.canEditPost(post, req.session.user)) {
      return res.status(403).render('403');
    }
    const { title, category, excerpt, body } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.render('edit', { post, error: 'Title and body are required.' });
    }
    await postsService.update(req.params.id, { title, category, excerpt, body });
    res.redirect(`/posts/${req.params.id}`);
  } catch (err) { next(err); }
});

// Delete post
app.post('/posts/:id/delete', auth.requireAuth, async (req, res, next) => {
  try {
    const post = await postsService.getById(req.params.id);
    if (!post) return res.status(404).render('404');
    if (!auth.canDeletePost(post, req.session.user)) {
      return res.status(403).render('403');
    }
    await postsService.remove(req.params.id);
    res.redirect('/');
  } catch (err) { next(err); }
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
app.get('/profile/:id', async (req, res, next) => {
  try {
    const profile = await auth.getProfile(req.params.id);
    if (!profile) return res.status(404).render('404');
    const posts = await postsService.getByAuthor(req.params.id);
    const user = req.session.user;
    res.render('profile', {
      profile, posts, formatDate,
      isOwner: user && user.id === profile.id,
      currentUser: user,
    });
  } catch (err) { next(err); }
});

// 404 fallback
app.use((req, res) => res.status(404).render('404'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong.');
});

app.listen(PORT, () => console.log(`BLCK.BLOG running → http://localhost:${PORT}`));
