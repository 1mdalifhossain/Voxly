import { supabase } from "./supabaseClient.js";
import { getLikeCountsForPosts } from "./likes.js";

export const POST_MEDIA_BUCKET = "post-media";

const MAX_CONTENT_LENGTH = 2000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const AUTHOR_SELECT = "*, profiles:user_id (id, username, display_name, avatar_url), post_likes (count)";

function friendlyDbError(error) {
  if (!error) return null;
  if (/content_length/i.test(error.message || "")) {
    return `Posts can be at most ${MAX_CONTENT_LENGTH} characters.`;
  }
  if (/content_or_image/i.test(error.message || "")) {
    return "A post needs some text or an image.";
  }
  return error.message || "Something went wrong. Please try again.";
}

/** Normalize a raw row's `post_likes: [{count}]` embed into a plain number. */
function normalizePost(row) {
  if (!row) return row;
  const likeCount = row.post_likes?.[0]?.count ?? 0;
  const { post_likes, ...rest } = row;
  return { ...rest, like_count: likeCount };
}

/** Pull unique, lowercased #hashtags out of a post's text. */
export function extractHashtags(content) {
  if (!content) return [];
  const matches = content.match(/#([a-zA-Z0-9_]+)/g) || [];
  const unique = new Set(matches.map((tag) => tag.slice(1).toLowerCase()));
  return [...unique];
}

/** Split content into plain-text and hashtag segments for rendering. */
export function splitContentByHashtags(content) {
  if (!content) return [];
  const parts = content.split(/(#[a-zA-Z0-9_]+)/g).filter((part) => part.length > 0);
  return parts.map((part) =>
    part.startsWith("#") ? { type: "hashtag", value: part.slice(1) } : { type: "text", value: part }
  );
}

function validateImageFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, WEBP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is too large — please choose one under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}

/** Upload a post image to the post-media bucket and return its public URL. */
export async function uploadPostImage(userId, file) {
  const validationError = validateImageFile(file);
  if (validationError) return { url: null, error: { message: validationError } };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(POST_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data?.publicUrl ?? null, error: null };
}

/** Create a new post, optionally uploading an image first. */
export async function createPost(userId, { content = "", imageFile = null }) {
  let imageUrl = null;
  if (imageFile) {
    const { url, error } = await uploadPostImage(userId, imageFile);
    if (error) return { data: null, error };
    imageUrl = url;
  }

  const trimmed = content.trim();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: trimmed,
      image_url: imageUrl,
      hashtags: extractHashtags(trimmed),
    })
    .select(AUTHOR_SELECT)
    .single();

  return { data: normalizePost(data), error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Update a post's text (and optionally its image). Only the owner can succeed, enforced by RLS too. */
export async function updatePost(postId, userId, { content, imageFile, removeImage = false }) {
  const updates = {};

  if (typeof content === "string") {
    const trimmed = content.trim();
    updates.content = trimmed;
    updates.hashtags = extractHashtags(trimmed);
  }

  if (imageFile) {
    const { url, error } = await uploadPostImage(userId, imageFile);
    if (error) return { data: null, error };
    updates.image_url = url;
  } else if (removeImage) {
    updates.image_url = null;
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .eq("user_id", userId)
    .select(AUTHOR_SELECT)
    .single();

  return { data: normalizePost(data), error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Delete a post you own. */
export async function deletePost(postId, userId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
  return { error };
}

const PAGE_SIZE = 10;

/**
 * Recent feed, newest first, with keyset (cursor) pagination for infinite scroll.
 * Pass the `created_at` of the last post seen as `cursor` to get the next page.
 * Optionally filter to posts containing a given hashtag.
 */
export async function listRecentPosts({ cursor = null, pageSize = PAGE_SIZE, hashtag = null } = {}) {
  let query = supabase
    .from("posts")
    .select(AUTHOR_SELECT)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (cursor) query = query.lt("created_at", cursor);
  if (hashtag) query = query.contains("hashtags", [hashtag.toLowerCase()]);

  const { data, error } = await query;
  const posts = (data ?? []).map(normalizePost);
  return {
    data: posts,
    nextCursor: posts.length === pageSize ? posts[posts.length - 1].created_at : null,
    error,
  };
}

/**
 * Trending feed — posts from the last few days ranked by how often their
 * hashtags are currently trending. Offset-paginated since the window is small.
 */
export async function listTrendingPosts({ offset = 0, pageSize = PAGE_SIZE, since = "3 days", hashtag = null } = {}) {
  const { data, error } = await supabase.rpc("get_trending_posts", {
    p_limit: pageSize,
    p_offset: offset,
    p_since: since,
  });

  let rows = data ?? [];
  if (hashtag) rows = rows.filter((row) => row.hashtags?.includes(hashtag.toLowerCase()));

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

  return {
    data: posts,
    nextOffset: rows.length === pageSize ? offset + pageSize : null,
    error,
  };
}

/** Top trending hashtags for the sidebar widget. */
export async function getTrendingHashtags(limit = 8, since = "3 days") {
  const { data, error } = await supabase.rpc("get_trending_hashtags", { p_limit: limit, p_since: since });
  return { data: data ?? [], error };
}
