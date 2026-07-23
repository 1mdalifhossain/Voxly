import { supabase } from "./supabaseClient.js";

export const AVATAR_BUCKET = "avatars";
export const COVER_BUCKET = "covers";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const SOCIAL_PLATFORMS = [
  { key: "website", label: "Website", placeholder: "https://yoursite.com" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/yourhandle" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourhandle" },
];

function friendlyDbError(error) {
  if (!error) return null;
  if (error.code === "23505") return "That username is already taken.";
  if (/username_format/i.test(error.message || "")) {
    return "Usernames can only contain letters, numbers, and underscores.";
  }
  if (/username_length/i.test(error.message || "")) {
    return "Usernames must be between 3 and 20 characters.";
  }
  if (/bio_length/i.test(error.message || "")) {
    return "Bio must be 160 characters or fewer.";
  }
  return error.message || "Something went wrong. Please try again.";
}

/** Fetch a profile by its (case-insensitive) username. */
export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle();
  return { data, error };
}

/** Fetch a profile by user id. */
export async function getProfileById(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return { data, error };
}

/** Check whether a username is free to use (optionally excluding the current user's own row). */
export async function isUsernameAvailable(username, currentUserId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (error) return { available: false, error };
  if (!data) return { available: true, error: null };
  return { available: data.id === currentUserId, error: null };
}

/** Update editable profile fields (username, display_name, bio, social_links). */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  return { data, error: error ? { ...error, message: friendlyDbError(error) } : null };
}

function validateImageFile(file, maxBytes) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, WEBP, or GIF image.";
  }
  if (file.size > maxBytes) {
    return `Image is too large — please choose one under ${Math.round(maxBytes / (1024 * 1024))}MB.`;
  }
  return null;
}

async function uploadImage({ bucket, userId, file, maxBytes, column }) {
  const validationError = validateImageFile(file, maxBytes);
  if (validationError) return { url: null, error: { message: validationError } };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${column}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return { url: null, error: uploadError };

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = publicUrlData?.publicUrl;

  const { data, error } = await updateProfile(userId, { [column]: url });
  if (error) return { url: null, error };

  return { url, error: null, profile: data };
}

/** Upload a new avatar image, store it in the `avatars` bucket, and save the URL on the profile. */
export async function uploadAvatar(userId, file) {
  return uploadImage({ bucket: AVATAR_BUCKET, userId, file, maxBytes: MAX_AVATAR_BYTES, column: "avatar_url" });
}

/** Upload a new cover photo, store it in the `covers` bucket, and save the URL on the profile. */
export async function uploadCoverPhoto(userId, file) {
  return uploadImage({ bucket: COVER_BUCKET, userId, file, maxBytes: MAX_COVER_BYTES, column: "cover_url" });
}

/** Follow another user. */
export async function followUser(followerId, followingId) {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
  return { error };
}

/** Unfollow a user. */
export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return { error };
}

/** Whether `followerId` currently follows `followingId`. */
export async function getFollowStatus(followerId, followingId) {
  if (!followerId || !followingId) return { isFollowing: false, error: null };
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return { isFollowing: !!data, error };
}

/** Which of the given user ids `followerId` already follows (batch lookup, e.g. for search results). */
export async function getFollowingIds(followerId, targetIds) {
  if (!followerId || !targetIds?.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", followerId)
    .in("following_id", targetIds);
  return { data: (data ?? []).map((r) => r.following_id), error };
}

/** Follower / following counts for a user. */
export async function getFollowCounts(userId) {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    error: followers.error || following.error || null,
  };
}

/** List the profiles that follow `userId`. */
export async function listFollowers(userId) {
  const { data, error } = await supabase
    .from("follows")
    .select("created_at, profiles:follower_id (id, username, display_name, avatar_url, bio)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  return { data: data?.map((row) => row.profiles).filter(Boolean) ?? [], error };
}

/** List the profiles that `userId` follows. */
export async function listFollowing(userId) {
  const { data, error } = await supabase
    .from("follows")
    .select("created_at, profiles:following_id (id, username, display_name, avatar_url, bio)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  return { data: data?.map((row) => row.profiles).filter(Boolean) ?? [], error };
}

/**
 * Subscribe to live follow/unfollow events for a profile being viewed.
 * `onFollowerChange(delta, row)` fires with +1/-1 when someone follows or
 * unfollows `userId`; `onFollowingChange(delta, row)` fires when `userId`
 * (viewed as a follower) follows/unfollows someone else.
 * Returns an unsubscribe function.
 */
export function subscribeToFollows(userId, { onFollowerChange, onFollowingChange } = {}) {
  const channel = supabase
    .channel(`follows:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${userId}` },
      (payload) => onFollowerChange?.(1, payload.new)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "follows", filter: `following_id=eq.${userId}` },
      (payload) => onFollowerChange?.(-1, payload.old)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "follows", filter: `follower_id=eq.${userId}` },
      (payload) => onFollowingChange?.(1, payload.new)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "follows", filter: `follower_id=eq.${userId}` },
      (payload) => onFollowingChange?.(-1, payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * "People you may know" — profiles `userId` doesn't already follow, ranked
 * by follower count. Works for logged-out visitors too (pass userId as null).
 */
export async function getSuggestedUsers(userId, limit = 5) {
  const { data, error } = await supabase.rpc("get_suggested_users", {
    p_user_id: userId ?? null,
    p_limit: limit,
  });
  return { data: data ?? [], error };
}
