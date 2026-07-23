import { supabase } from "./supabaseClient.js";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "ja", label: "日本語" },
  { code: "ar", label: "العربية" },
];

export const MESSAGE_PRIVACY_OPTIONS = [
  { value: "everyone", label: "Everyone", hint: "Any Voxly user can start a conversation with you." },
  { value: "following", label: "People you follow", hint: "Only accounts you follow can message you." },
  { value: "nobody", label: "No one", hint: "Turn off new DM requests entirely." },
];

/** Patch any subset of theme / language / is_private / message_privacy. */
export async function updateSettings(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}

/** Block a user — they'll disappear from search/suggestions and can no longer DM you. */
export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
  return { error };
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return { error };
}

/** List of profiles the current user has blocked, most recently blocked first. */
export async function listBlockedUsers(blockerId) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("created_at, blocked:blocked_id (id, username, display_name, avatar_url)")
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });
  return { data: data?.map((row) => ({ ...row.blocked, blocked_at: row.created_at })) || [], error };
}

/** Whether the current user has blocked a specific profile. */
export async function isBlockedByMe(blockerId, blockedId) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  return { isBlocked: !!data, error };
}

/** ids of every user the current user has blocked OR that has blocked the current user. */
export async function listBlockedRelationshipIds(userId) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) return { ids: [], error };
  const ids = new Set();
  for (const row of data) {
    ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
  }
  return { ids, error: null };
}

/**
 * Soft-deletes the account: wipes profile fields and marks deleted_at via the
 * `request_account_deletion` RPC (see supabase/settings_schema.sql for why
 * this can't fully delete the auth user from the client). Caller is
 * responsible for signing the user out afterward.
 */
export async function requestAccountDeletion() {
  const { error } = await supabase.rpc("request_account_deletion");
  return { error };
}
