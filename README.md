# BLCK.BLOG

> A dark-mode blog engine. Quill WYSIWYG, Supabase Auth + PostgreSQL, Express 5 session auth, server-rendered EJS.

---

## Features

- Rich-text editing via Quill 1.3.7 (bold, italic, headings, lists, blockquotes, links)
- Sign-up/sign-in via Supabase Auth with Express session persistence
- Category autocomplete from 28 curated categories
- CRUD posts with auto-generated excerpts (first 120 chars) and read-time estimates (200 wpm)
- Likes and Share via `navigator.share()` with clipboard URL fallback
- Recommendation engine: queries posts in categories the user has liked
- Author profiles at `/profile/:id` with post grid and owner edit/delete
- Related posts section below each post
- Mobile responsive with hamburger nav

---

## Using the Blog

### Writing a Post

1. Click **Write** in the nav (or "Write Something" on the home page)
2. Enter a **title** and optional **category** (start typing to autocomplete from 28 curated categories)
3. Add an **excerpt** (leave blank for auto-generation from body)
4. Use the **Quill editor** to format your body text (toolbar: bold, italic, underline, strike, headings, lists, alignment, blockquote, link, clean)
5. Click **Publish Post**

### Editing & Deleting

- Visit your **profile page** (click your name in the nav) to see Edit and Delete buttons on your posts
- On a **post page**, if you're the author (or an admin), Edit and Delete appear in the sidebar

### Liking & Sharing

- Click the **heart** below a post to toggle the like
- Click **Share** to use the system share sheet (copies URL to clipboard as fallback)

### Recommendations

- Once you have liked a few posts, the home page shows a **Recommended for You** section with posts in categories you have engaged with

### Profile & Logout

- Click your **name** in the nav to see all your posts
- **Logout** button is on your profile page

---

## Tech Stack

Node.js / Express 5 · EJS templates · Supabase (PostgreSQL + Auth) · Quill.js 1.3.7 · server-side sessions · vanilla CSS

---

## Quick Start

```bash
npm install
```

Copy `.env.example` to `.env` and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_service_role_key
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_anon_key
SESSION_SECRET=a-long-random-string
```

Run `backend/master.sql` in your Supabase SQL Editor to create the schema. Then:

```bash
npm start              # → http://localhost:3000
```

Deploy to Vercel by importing the repo and setting the same env vars.

---

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST | `/auth/login` | No | Login |
| GET/POST | `/auth/signup` | No | Sign up |
| POST | `/auth/logout` | No | Logout |
| GET | `/` | No | Home |
| GET/POST | `/posts/new` | Required | Create post |
| GET/POST | `/posts/:id/edit` | Owner | Edit post |
| POST | `/posts/:id/delete` | Owner | Delete post |
| POST | `/posts/:id/like` | Required | Toggle like |
| GET | `/posts/:id` | No | View post |
| GET | `/profile/:id` | No | Author profile |

---

## Project Structure

```
backend/          auth.js, posts.js, likes.js, categories.js, master.sql, seed.js
public/           css/style.css, js/main.js, favicon.svg
views/            EJS templates (index, post, new, edit, profile, auth/*, partials/*)
server.js         Express 5 app - routes, middleware, sessions
```

---

## Design

```
--red:   #ff5949    --black: #0a0a0a    --white: #f5f4f0
--grey:  #bcbcbc    --border:#666666    --card-bg: #111111
Fonts:   Bebas Neue (display) · Barlow Condensed (nav) · Barlow (body)
```

---

## Screenshots

<p align="center">
  <img src="./screenshots/home.png" alt="Home" width="700" />
</p>

<p align="center">
  <img src="./screenshots/post.png" alt="Post" width="700" />
</p>
