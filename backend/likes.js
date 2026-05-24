const { supabase } = require('./supabase');

async function toggle(postId, userId) {
  const { data: existing } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    return { liked: false };
  }

  await supabase
    .from('likes')
    .insert({ post_id: postId, user_id: userId });

  return { liked: true };
}

async function getCount(postId) {
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) return 0;
  return count;
}

async function getUserLikedPostIds(userId) {
  const { data } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId);

  return (data || []).map(r => r.post_id);
}

async function isLiked(postId, userId) {
  if (!userId) return false;
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

async function getRecommended(userId, limit = 4) {
  if (!userId) return [];

  // Categories the user has liked
  const { data: likedCats } = await supabase
    .from('likes')
    .select('posts(category)')
    .eq('user_id', userId);

  const categories = [...new Set(
    (likedCats || [])
      .map(r => r.posts?.category)
      .filter(Boolean)
  )];

  if (categories.length === 0) return [];

  const likedIds = await getUserLikedPostIds(userId);

  // Posts in those categories, excluding already-liked ones
  const { data } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(display_name)')
    .in('category', categories)
    .order('date', { ascending: false })
    .limit(limit + likedIds.length);

  const filtered = (data || [])
    .filter(p => !likedIds.includes(p.id))
    .slice(0, limit)
    .map(p => ({
      id: p.id,
      author_id: p.author_id,
      author_name: p.profiles?.display_name || null,
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      date: p.date,
      readTime: `${Math.max(1, Math.ceil((p.body || '').split(/\s+/).length / 200))} min`,
    }));

  return filtered;
}

module.exports = { toggle, getCount, getUserLikedPostIds, isLiked, getRecommended };
