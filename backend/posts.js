const { supabase } = require('./supabase');

const TABLE = 'posts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

function computeReadTime(body) {
  const text = stripHtml(body).trim();
  const words = text ? text.split(/\s+/).length : 0;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function formatPost(row) {
  return {
    id: row.id,
    author_id: row.author_id,
    author_name: row.profiles?.display_name || null,
    title: row.title,
    category: row.category,
    excerpt: row.excerpt,
    body: row.body,
    date: row.date,
    readTime: computeReadTime(row.body),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

async function getAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, profiles!posts_author_id_fkey(display_name)')
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map(formatPost);
}

async function getById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, profiles!posts_author_id_fkey(display_name)')
    .eq('id', id)
    .single();

  if (error) return null;
  return formatPost(data);
}

async function create({ title, category, excerpt, body, authorId }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      author_id: authorId || null,
      title: title.trim(),
      category: category?.trim() || 'Uncategorized',
      excerpt: excerpt?.trim() || stripHtml(body).trim().slice(0, 120) + '…',
      body: body.trim(),
    })
    .select('*, profiles!posts_author_id_fkey(display_name)')
    .single();

  if (error) throw error;
  return formatPost(data);
}

async function update(id, { title, category, excerpt, body }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      title: title.trim(),
      category: category?.trim() || 'Uncategorized',
      excerpt: excerpt?.trim() || stripHtml(body).trim().slice(0, 120) + '…',
      body: body.trim(),
    })
    .eq('id', id)
    .select('*, profiles!posts_author_id_fkey(display_name)')
    .single();

  if (error) throw error;
  return formatPost(data);
}

async function getByAuthor(authorId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, profiles!posts_author_id_fkey(display_name)')
    .eq('author_id', authorId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map(formatPost);
}

async function remove(id) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

module.exports = { getAll, getById, getByAuthor, create, update, remove };
