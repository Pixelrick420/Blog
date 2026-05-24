require('dotenv').config();
const { supabase, supabasePublishable } = require('./supabase');

const EMAIL = 'test@example.com';
const PASSWORD = 'password';
const DISPLAY_NAME = 'Test';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FORMATTERS = [
  (w) => `<p>${w}</p>`,
  (w) => `<p><strong>${w}</strong></p>`,
  (w) => `<p><em>${w}</em></p>`,
  (w) => `<h1>${w}</h1>`,
  (w) => `<h2>${w}</h2>`,
  (w) => `<h3>${w}</h3>`,
  (w) => `<blockquote>${w}</blockquote>`,
  (w) => `<p class="ql-align-center">${w}</p>`,
  (w) => `<p class="ql-align-right">${w}</p>`,
  (w) => `<p class="ql-align-center"><strong>${w}</strong></p>`,
  (w) => `<p class="ql-align-right"><em>${w}</em></p>`,
  (w) => `<ul><li>${w}</li></ul>`,
  (w) => `<ol><li>${w}</li></ol>`,
  (w) => `<pre>${w}</pre>`,
];

function randomBody(word, minLines, maxLines) {
  const count = rand(minLines, maxLines);
  return Array.from({ length: count }, () => {
    const fmt = FORMATTERS[rand(0, FORMATTERS.length - 1)];
    return fmt(word);
  }).join('\n');
}

const WORDS = ['This', 'Is', 'A', 'Test', 'To', 'See', 'If', 'The', 'Website', 'Works'];
const CATEGORIES = ['Design', 'History', 'Business', 'Science', 'Productivity', 'Culture', 'Philosophy', 'Technology', 'Writing', 'Finance'];

const posts = WORDS.map((w, i) => ({
  title: w,
  category: CATEGORIES[i],
  excerpt: w + '.',
  body: randomBody(w, 8, 40),
}));

async function seed() {
  let userId;

  // Check if test user already exists via sign-in attempt
  const { data: signInData, error: signInError } = await supabasePublishable.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (signInData?.user) {
    console.log('Test user already exists, reusing...');
    userId = signInData.user.id;
  } else {
    // Sign up new user
    const { data, error } = await supabasePublishable.auth.signUp({
      email: EMAIL,
      password: PASSWORD,
      options: { data: { display_name: DISPLAY_NAME } },
    });
    if (error) {
      console.error('Signup failed:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log('Created test user:', userId);
  }

  // Ensure profile exists
  await new Promise(r => setTimeout(r, 1000));
  await supabase.from('profiles').upsert(
    { id: userId, display_name: DISPLAY_NAME },
    { onConflict: 'id' }
  );

  // Fetch existing post titles to avoid duplicates
  const { data: existing } = await supabase
    .from('posts')
    .select('title')
    .eq('author_id', userId);

  const existingTitles = new Set((existing || []).map(p => p.title));

  // Insert posts
  let created = 0;
  for (const post of posts) {
    if (existingTitles.has(post.title)) {
      console.log(`  Skipping "${post.title}" — already exists`);
      continue;
    }
    const { error } = await supabase.from('posts').insert({
      author_id: userId,
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      body: post.body,
    });
    if (error) {
      console.error(`  Error creating "${post.title}":`, error.message);
    } else {
      console.log(`  Created "${post.title}"`);
      created++;
    }
  }

  console.log(`\nDone! Created ${created} new post(s). Total posts: ${existingTitles.size + created}`);
  process.exit(0);
}

seed();
