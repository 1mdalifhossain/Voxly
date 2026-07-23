import { supabase } from "./supabaseClient.js";

/** Whether the given user has liked a single post. */
export async function getPostLikeStatus(postId, userId) {
  if (!userId) return { liked: false, error: null };
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  return { liked: !!data, error };
}

/** Which of the given post ids the current user has liked (batch lookup, e.g. for a feed page). */
export async function getLikedPostIds(userId, postIds) {
  if (!userId || !postIds?.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return { data: (data ?? []).map((r) => r.post_id), error };
}

/** Like counts for a batch of posts, keyed by post id. Useful where posts don't already carry a count (e.g. trending RPC results). */
export async function getLikeCountsForPosts(postIds) {
  if (!postIds?.length) return { data: {}, error: null };
  const { data, error } = await supabase.from("post_likes").select("post_id").in("post_id", postIds);
  const counts = {};
  (data ?? []).forEach((row) => {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  });
  return { data: counts, error };
}

/** Like a post. */
export async function likePost(postId, userId) {
  const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  return { error };
}

/** Unlike a post. */
export async function unlikePost(postId, userId) {
  const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  return { error };
}

/** Who liked a post — most recently liked first, with profile info for the "who liked" list. */
export async function getPostLikers(postId, limit = 100) {
  const { data, error } = await supabase
    .from("post_likes")
    .select("created_at, user_id, profiles:user_id (id, username, display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data ?? []).map((row) => row.profiles).filter(Boolean), error };
}

/**
 * Subscribe to live like/unlike events for a single post. post_likes carries
 * post_id, so we can filter server-side rather than streaming every like.
 * Returns an unsubscribe function.
 */
export function subscribeToPostLikes(postId, { onLike, onUnlike }) {
  const channel = supabase
    .channel(`post_likes:${postId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "post_likes", filter: `post_id=eq.${postId}` },
      (payload) => onLike?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "post_likes", filter: `post_id=eq.${postId}` },
      (payload) => onUnlike?.(payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
