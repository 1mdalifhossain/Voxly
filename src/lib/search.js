import { supabase } from "./supabaseClient.js";
import { getLikeCountsForPosts } from "./likes.js";

const PAGE_SIZE = 10;

/** Search profiles by username or display name. Exact username matches rank first, then by follower count. */
export async function searchUsers(query, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const trimmed = (query || "").trim();
  if (!trimmed) return { data: [], nextOffset: null, error: null };

  const { data, error } = await supabase.rpc("search_users", {
    p_query: trimmed,
    p_limit: limit,
    p_offset: offset,
  });

  const users = data ?? [];
  return { data: users, nextOffset: users.length === limit ? offset + limit : null, error };
}

/** Full-text search over post content, ranked by relevance then recency. Shaped for direct use with PostCard. */
export async function searchPosts(query, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const trimmed = (query || "").trim();
  if (!trimmed) return { data: [], nextOffset: null, error: null };

  const { data, error } = await supabase.rpc("search_posts", {
    p_query: trimmed,
    p_limit: limit,
    p_offset: offset,
  });

  const rows = data ?? [];
  const { data: likeCounts } = await getLikeCountsForPosts(rows.map((row) => row.id));

  const posts = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    image_url: row.image_url,
    hashtags: row.hashtags,
    edited: row.edited,
    created_at: row.created_at,
    updated_at: row.updated_at,
    like_count: likeCounts?.[row.id] ?? 0,
    profiles: { id: row.user_id, username: row.username, display_name: row.display_name, avatar_url: row.avatar_url },
  }));

  return { data: posts, nextOffset: rows.length === limit ? offset + limit : null, error };
}

/** Search hashtags by substring, most-used (all-time) first. */
export async function searchHashtags(query, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const trimmed = (query || "").trim().replace(/^#/, "");
  if (!trimmed) return { data: [], nextOffset: null, error: null };

  const { data, error } = await supabase.rpc("search_hashtags", {
    p_query: trimmed,
    p_limit: limit,
    p_offset: offset,
  });

  const tags = data ?? [];
  return { data: tags, nextOffset: tags.length === limit ? offset + limit : null, error };
}
