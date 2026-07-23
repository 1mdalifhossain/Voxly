import { supabase } from "./supabaseClient.js";
import { getProfileById } from "./profiles.js";

const NOTIFICATION_SELECT =
  "*, actor:actor_id (id, username, display_name, avatar_url), post:post_id (id, content, image_url), comment:comment_id (id, content)";

const PAGE_SIZE = 20;

/**
 * Paginated notifications for the current user, newest first. Pass the
 * `created_at` of the last notification seen as `cursor` for the next page.
 * Optionally filter to a single type: 'like' | 'comment' | 'follow' | 'mention'.
 */
export async function getNotifications(userId, { cursor = null, pageSize = PAGE_SIZE, type = null } = {}) {
  if (!userId) return { data: [], nextCursor: null, error: null };

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (cursor) query = query.lt("created_at", cursor);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  const notifications = data ?? [];
  return {
    data: notifications,
    nextCursor: notifications.length === pageSize ? notifications[notifications.length - 1].created_at : null,
    error,
  };
}

/** Count of unread notifications, optionally by type (for tab badges). */
export async function getUnreadCount(userId, type = null) {
  if (!userId) return { count: 0, error: null };
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  if (type) query = query.eq("type", type);
  const { count, error } = await query;
  return { count: count ?? 0, error };
}

/** Mark a single notification as read. */
export async function markNotificationRead(notificationId, userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("recipient_id", userId);
  return { error };
}

/** Mark every notification for this user as read. */
export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  return { error };
}

/** Dismiss (delete) a single notification. */
export async function deleteNotification(notificationId, userId) {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("recipient_id", userId);
  return { error };
}

/** Build a short, human-readable line for a notification, e.g. for the bell dropdown. */
export function describeNotification(notification) {
  const name = notification.actor?.display_name || notification.actor?.username || "Someone";
  switch (notification.type) {
    case "like":
      return `${name} liked your post`;
    case "comment":
      return `${name} commented on your post`;
    case "follow":
      return `${name} started following you`;
    case "mention":
      return notification.comment_id ? `${name} mentioned you in a comment` : `${name} mentioned you in a post`;
    default:
      return `${name} interacted with your content`;
  }
}

/** Short text preview (post or comment content) to show under the notification line, if any. */
export function notificationPreview(notification) {
  const text = notification.comment?.content || notification.post?.content || "";
  if (!text) return null;
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/**
 * Realtime INSERT payloads only carry the bare notifications row — no
 * actor/post/comment joins. This fetches those bits so a live notification
 * can be rendered the same way as ones loaded from getNotifications().
 */
export async function hydrateNotification(row) {
  const [{ data: actor }, postResult, commentResult] = await Promise.all([
    getProfileById(row.actor_id),
    row.post_id
      ? supabase.from("posts").select("id, content, image_url").eq("id", row.post_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.comment_id
      ? supabase.from("comments").select("id, content").eq("id", row.comment_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { ...row, actor, post: postResult?.data ?? null, comment: commentResult?.data ?? null };
}

/**
 * Subscribe to live notifications for the current user — new likes, comments,
 * follows, and mentions land here instantly, and retracted ones (unlike,
 * unfollow) are removed. Returns an unsubscribe function.
 */
export function subscribeToNotifications(userId, { onInsert, onUpdate, onDelete }) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      (payload) => onUpdate?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      (payload) => onDelete?.(payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
