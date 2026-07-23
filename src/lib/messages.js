import { supabase } from "./supabaseClient.js";

export const MESSAGE_IMAGE_BUCKET = "message-media";
export const VOICE_MESSAGE_BUCKET = "voice-messages";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VOICE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const CONVERSATION_SELECT =
  "*, participants:conversation_participants (user_id, last_read_at, profile:user_id (id, username, display_name, avatar_url))";

const MESSAGE_SELECT = "*, sender:sender_id (id, username, display_name, avatar_url)";

function friendlyDbError(error) {
  if (!error) return null;
  if (/message_has_content/i.test(error.message || "")) {
    return "A message needs some text, an image, or a voice note.";
  }
  if (/content_length/i.test(error.message || "")) {
    return "That message is too long.";
  }
  return error.message || "Something went wrong. Please try again.";
}

/** Pull the "other" participant out of a conversation row (this is a 1:1 thread). */
export function getOtherParticipant(conversation, currentUserId) {
  return conversation?.participants?.find((p) => p.user_id !== currentUserId)?.profile ?? null;
}

/** Pull the current user's own participant row (mainly for last_read_at). */
export function getOwnParticipant(conversation, currentUserId) {
  return conversation?.participants?.find((p) => p.user_id === currentUserId) ?? null;
}

/** Whether a conversation has an unread message for this user. */
export function isUnread(conversation, currentUserId) {
  if (!conversation || conversation.last_message_sender_id === currentUserId) return false;
  const own = getOwnParticipant(conversation, currentUserId);
  if (!own) return false;
  return new Date(conversation.last_message_at) > new Date(own.last_read_at);
}

/** Find (or open) the 1:1 thread with another user and return its id. */
export async function getOrCreateConversation(otherUserId) {
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    p_other_user_id: otherUserId,
  });
  return { conversationId: data ?? null, error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Inbox — every conversation the current user is in, newest first. RLS scopes this to just their threads. */
export async function listConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .order("last_message_at", { ascending: false });
  return { data: data ?? [], error };
}

/** A single conversation by id (used when opening a thread from a link/notification). */
export async function getConversation(conversationId) {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_SELECT).eq("id", conversationId).maybeSingle();
  return { data, error };
}

const PAGE_SIZE = 30;

/** Messages in a thread, oldest first, with keyset pagination for "load earlier". */
export async function listMessages(conversationId, { cursor = null, pageSize = PAGE_SIZE } = {}) {
  let query = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  const messages = (data ?? []).reverse();
  return {
    data: messages,
    nextCursor: messages.length === pageSize ? messages[0].created_at : null,
    error,
  };
}

function validateImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, WEBP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is too large — please choose one under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}

function validateVoiceFile(blob) {
  if (blob.size > MAX_VOICE_BYTES) {
    return `Voice note is too long — please keep it under ${Math.round(MAX_VOICE_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}

/** Upload a message image to the message-media bucket and return its public URL. */
export async function uploadMessageImage(conversationId, userId, file) {
  const validationError = validateImageFile(file);
  if (validationError) return { url: null, error: { message: validationError } };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${conversationId}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(MESSAGE_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from(MESSAGE_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data?.publicUrl ?? null, error: null };
}

/** Upload a recorded voice note to the voice-messages bucket and return its public URL. */
export async function uploadVoiceMessage(conversationId, userId, blob, { mimeType = "audio/webm" } = {}) {
  const validationError = validateVoiceFile(blob);
  if (validationError) return { url: null, error: { message: validationError } };

  const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
  const path = `${conversationId}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(VOICE_MESSAGE_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: mimeType,
  });
  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from(VOICE_MESSAGE_BUCKET).getPublicUrl(path);
  return { url: data?.publicUrl ?? null, error: null };
}

/** Send a text message. */
export async function sendTextMessage(conversationId, userId, content) {
  const trimmed = content.trim();
  if (!trimmed) return { data: null, error: null };
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, content: trimmed })
    .select(MESSAGE_SELECT)
    .single();
  return { data, error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Upload an image (optionally with a caption) and send it as a message. */
export async function sendImageMessage(conversationId, userId, imageFile, caption = "") {
  const { url, error: uploadError } = await uploadMessageImage(conversationId, userId, imageFile);
  if (uploadError) return { data: null, error: uploadError };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, image_url: url, content: caption.trim() || null })
    .select(MESSAGE_SELECT)
    .single();
  return { data, error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Upload a recorded voice note and send it as a message. */
export async function sendVoiceMessage(conversationId, userId, blob, durationSeconds, { mimeType } = {}) {
  const { url, error: uploadError } = await uploadVoiceMessage(conversationId, userId, blob, { mimeType });
  if (uploadError) return { data: null, error: uploadError };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      voice_url: url,
      voice_duration: Math.max(1, Math.round(durationSeconds || 0)),
    })
    .select(MESSAGE_SELECT)
    .single();
  return { data, error: error ? { ...error, message: friendlyDbError(error) } : null };
}

/** Mark a thread as read up to now — clears "unread" in the inbox and drives the other side's "Seen". */
export async function markConversationRead(conversationId, userId) {
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  return { error };
}

/**
 * Subscribe to everything live in one open thread: new messages, the other
 * participant's read position (for "Seen"), and typing broadcasts. Returns
 * `{ unsubscribe, sendTyping }` — call `sendTyping(true/false)` on the same
 * channel instead of opening a second one.
 */
export function subscribeToConversation(conversationId, currentUserId, { onMessage, onParticipantUpdate, onTyping }) {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onParticipantUpdate?.(payload.new)
    )
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.user_id !== currentUserId) onTyping?.(payload);
    })
    .subscribe();

  const sendTyping = (isTyping) => {
    channel.send({ type: "broadcast", event: "typing", payload: { user_id: currentUserId, is_typing: isTyping } });
  };

  return { unsubscribe: () => supabase.removeChannel(channel), sendTyping };
}

/** Subscribe to inbox-level changes: new threads appearing, and previews/read-state updating. */
export function subscribeToInbox({ onConversationChange, onParticipantChange }) {
  const channel = supabase
    .channel("inbox")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, (payload) =>
      onConversationChange?.(payload.new)
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload) =>
      onConversationChange?.(payload.new)
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants" }, (payload) =>
      onParticipantChange?.(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
