import { supabase } from "./supabaseClient.js";

const MAX_LENGTH = 1000;
const AUTHOR_SELECT = "*, profiles:user_id (id, username, display_name, avatar_url), comment_likes (count)";

function friendlyDbError(error) {
  if (!error) return null;
  if (/comment_content_length/i.test(error.message || "")) {
    return "Comments must be between 1 and 1000 characters.";
  }
  return error.message || "Something went wrong. Please try again.";
}

/** Normalize a raw row's `comment_likes: [{count}]` embed into a plain number. */
function normalizeComment(row) {
  if (!row) return row;
  const likeCount = row.comment_likes?.[0]?.count ?? 0;
  const { comment_likes, ...rest } = row;
  return { ...rest, like_count: likeCount };
}

/** All comments for a post, flat (oldest first) — the UI builds the nested tree. */
export async function getComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select(AUTHOR_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return { data: (data ?? []).map(normalizeComment), error };
}

/** Which of the given comment ids the current user has liked. */
export async function getLikedCommentIds(userId, commentIds) {
  if (!userId || !commentIds?.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);
  return { data: (data ?? []).map((r) => r.comment_id), error };
}

/** Create a top-level comment or a reply (pass parentId). */
export async function createComment(postId, userId, { content, parentId = null }) {
  const trimmed = (content || "").trim();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, parent_id: parentId, user_id: userId, content: trimmed })
    .select(AUTHOR_SELECT)
    .single();

  return { data: normalizeComment(data), error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Edit your own comment's text. */
export async function updateComment(commentId, userId, content) {
  const trimmed = (content || "").trim();
  const { data, error } = await supabase
    .from("comments")
    .update({ content: trimmed })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select(AUTHOR_SELECT)
    .single();

  return { data: normalizeComment(data), error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Delete your own comment (and, via cascade, its replies and likes). */
export async function deleteComment(commentId, userId) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", userId);
  return { error };
}

/** Like a comment. */
export async function likeComment(commentId, userId) {
  const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
  return { error };
}

/** Unlike a comment. */
export async function unlikeComment(commentId, userId) {
  const { error } = await supabase
    .from("comment_likes")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", userId);
  return { error };
}

/** Turn a flat, oldest-first comment list into a nested tree keyed by parent_id. */
export function buildCommentTree(flatComments) {
  const byId = new Map(flatComments.map((c) => [c.id, { ...c, replies: [] }]));
  const roots = [];

  for (const comment of byId.values()) {
    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id).replies.push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}

/** Count every comment in a post's thread, including replies. */
export function countComments(flatComments) {
  return flatComments.length;
}

/**
 * Subscribe to live inserts/updates/deletes for a post's comments.
 * Returns an unsubscribe function.
 */
export function subscribeToComments(postId, { onInsert, onUpdate, onDelete }) {
  const channel = supabase
    .channel(`comments:${postId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
      (payload) => onUpdate?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
      (payload) => onDelete?.(payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to live like/unlike events. comment_likes has no post_id column,
 * so this streams all changes and lets the caller ignore ones for comments
 * it doesn't currently have loaded.
 */
export function subscribeToCommentLikes({ onLike, onUnlike }) {
  const channel = supabase
    .channel(`comment_likes:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "comment_likes" }, (payload) =>
      onLike?.(payload.new)
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "comment_likes" }, (payload) =>
      onUnlike?.(payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export const COMMENT_MAX_LENGTH = MAX_LENGTH;
