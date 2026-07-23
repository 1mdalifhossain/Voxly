import { supabase } from "./supabaseClient.js";

const PAGE_SIZE = 15;

export const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Nudity or sexual content",
  "Violence",
  "Impersonation",
  "Something else",
];

/** Aggregate counts for the dashboard's stat cards. Admins only (enforced in SQL). */
export async function getDashboardStats() {
  const { data, error } = await supabase.rpc("get_admin_stats");
  return { data, error };
}

/**
 * Day-bucketed counts for the last `days` days, inclusive of today.
 * Used for the signups / posts trend charts — small enough datasets that
 * bucketing client-side is simpler than a dedicated SQL function.
 */
function bucketByDay(rows, days) {
  const buckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export async function getSignupTrend(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", since.toISOString());
  if (error) return { data: [], error };
  return { data: bucketByDay(data, days), error: null };
}

export async function getPostTrend(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("posts")
    .select("created_at")
    .gte("created_at", since.toISOString());
  if (error) return { data: [], error };
  return { data: bucketByDay(data, days), error: null };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Paginated user list with optional username/display-name search and status filter. */
export async function listUsers({ search = "", page = 0, pageSize = PAGE_SIZE, filter = "all" } = {}) {
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_admin, is_banned, ban_reason, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (search.trim()) {
    query = query.or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`);
  }
  if (filter === "banned") query = query.eq("is_banned", true);
  if (filter === "admins") query = query.eq("is_admin", true);

  const { data, error, count } = await query;
  return { data: data ?? [], count: count ?? 0, error };
}

export async function banUser(userId, reason) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: true, ban_reason: reason?.trim() || null, banned_at: new Date().toISOString() })
    .eq("id", userId);
  return { error };
}

export async function unbanUser(userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: false, ban_reason: null, banned_at: null })
    .eq("id", userId);
  return { error };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

const POST_SELECT = "id, content, image_url, hashtags, created_at, edited, author:user_id (id, username, display_name, avatar_url)";

export async function listPostsAdmin({ search = "", page = 0, pageSize = PAGE_SIZE } = {}) {
  let query = supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (search.trim()) query = query.ilike("content", `%${search.trim()}%`);

  const { data, error, count } = await query;
  return { data: data ?? [], count: count ?? 0, error };
}

/** Delete any post, regardless of author (relies on the admin RLS policy). */
export async function deletePostAsAdmin(postId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  return { error };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const REPORT_SELECT = "*, reporter:reporter_id (id, username, display_name, avatar_url)";

export async function listReports({ status = "pending", page = 0, pageSize = PAGE_SIZE } = {}) {
  let query = supabase
    .from("reports")
    .select(REPORT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;
  return { data: data ?? [], count: count ?? 0, error };
}

/** Submit a new report (used by the reporting UI in the feed/rooms, not the admin panel itself). */
export async function createReport({ reporterId, targetType, targetId, targetLabel, reason, details }) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel || null,
    reason,
    details: details?.trim() || null,
  });
  return { error };
}

export async function resolveReport(reportId, adminId) {
  const { error } = await supabase
    .from("reports")
    .update({ status: "resolved", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  return { error };
}

export async function dismissReport(reportId, adminId) {
  const { error } = await supabase
    .from("reports")
    .update({ status: "dismissed", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  return { error };
}

// ---------------------------------------------------------------------------
// Voice rooms
// ---------------------------------------------------------------------------

const ROOM_SELECT = "*, host:host_id (id, username, display_name, avatar_url)";

export async function listRoomsAdmin({ status = "live", page = 0, pageSize = PAGE_SIZE } = {}) {
  let query = supabase
    .from("rooms")
    .select(ROOM_SELECT, { count: "exact" })
    .order("started_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error };

  const roomIds = data.map((r) => r.id);
  let listenerCounts = {};
  if (roomIds.length) {
    const { data: participants } = await supabase
      .from("room_participants")
      .select("room_id")
      .in("room_id", roomIds)
      .is("left_at", null);
    for (const p of participants ?? []) {
      listenerCounts[p.room_id] = (listenerCounts[p.room_id] || 0) + 1;
    }
  }

  return { data: data.map((r) => ({ ...r, participant_count: listenerCounts[r.id] || 0 })), count: count ?? 0, error: null };
}

/** End any room, regardless of host (relies on the admin RLS policy). */
export async function endRoomAsAdmin(roomId) {
  const { error } = await supabase
    .from("rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", roomId);
  return { error };
}
