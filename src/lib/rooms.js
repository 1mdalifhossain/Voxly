import { supabase } from "./supabaseClient.js";

const HOST_SELECT = "*, host:host_id (id, username, display_name, avatar_url)";
const PARTICIPANT_SELECT = "*, profile:user_id (id, username, display_name, avatar_url)";

/** Rooms currently live, newest first. */
export async function listLiveRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select(HOST_SELECT)
    .eq("status", "live")
    .order("started_at", { ascending: false });
  return { data: data ?? [], error };
}

/** A single room by id, including host profile. */
export async function getRoom(roomId) {
  const { data, error } = await supabase.from("rooms").select(HOST_SELECT).eq("id", roomId).maybeSingle();
  return { data, error };
}

/** Create a room and seat its creator as the host participant. */
export async function createRoom({ hostId, title, description }) {
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({ host_id: hostId, title: title.trim(), description: description?.trim() || null })
    .select(HOST_SELECT)
    .single();
  if (error) return { data: null, error };

  const { error: participantError } = await supabase
    .from("room_participants")
    .insert({ room_id: room.id, user_id: hostId, role: "host", muted: false });
  if (participantError) return { data: room, error: participantError };

  return { data: room, error: null };
}

/** End a room (host only — enforced by RLS). Leaves the historical row intact. */
export async function endRoom(roomId, hostId) {
  const { error } = await supabase
    .from("rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", roomId)
    .eq("host_id", hostId);
  return { error };
}

/** Active (left_at is null) participants for a room, host first then speakers then listeners. */
export async function listActiveParticipants(roomId) {
  const { data, error } = await supabase
    .from("room_participants")
    .select(PARTICIPANT_SELECT)
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  const rolePriority = { host: 0, speaker: 1, listener: 2 };
  const sorted = (data ?? []).sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
  return { data: sorted, error };
}

/** Active participant counts for a batch of rooms, e.g. for the lobby grid. Returns { [roomId]: count }. */
export async function getParticipantCounts(roomIds) {
  if (!roomIds.length) return { data: {}, error: null };
  const { data, error } = await supabase
    .from("room_participants")
    .select("room_id")
    .in("room_id", roomIds)
    .is("left_at", null);
  const counts = {};
  for (const row of data ?? []) counts[row.room_id] = (counts[row.room_id] || 0) + 1;
  return { data: counts, error };
}

/** Join a room as a listener. Safe to call again after leaving (rejoin). */
export async function joinRoom(roomId, userId) {
  const { data, error } = await supabase
    .from("room_participants")
    .insert({ room_id: roomId, user_id: userId, role: "listener", muted: true })
    .select(PARTICIPANT_SELECT)
    .single();
  return { data, error };
}

/** Mark a participant as having left (keeps history instead of deleting). */
export async function leaveRoom(roomId, userId) {
  const { error } = await supabase
    .from("room_participants")
    .update({ left_at: new Date().toISOString(), hand_raised: false })
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null);
  return { error };
}

/** Toggle the current user's own raised-hand state. */
export async function setHandRaised(roomId, userId, raised) {
  const { error } = await supabase
    .from("room_participants")
    .update({ hand_raised: raised })
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null);
  return { error };
}

/** Toggle the current user's own mic mute state (speakers/host only — a listener has nothing to mute). */
export async function setSelfMuted(roomId, userId, muted) {
  const { error } = await supabase
    .from("room_participants")
    .update({ muted })
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null);
  return { error };
}

/** Host action: promote a listener to speaker (also lowers their hand). */
export async function promoteToSpeaker(participantId) {
  const { error } = await supabase
    .from("room_participants")
    .update({ role: "speaker", hand_raised: false, muted: true })
    .eq("id", participantId);
  return { error };
}

/** Host action: move a speaker back down to listener. */
export async function demoteToListener(participantId) {
  const { error } = await supabase
    .from("room_participants")
    .update({ role: "listener", muted: true })
    .eq("id", participantId);
  return { error };
}

/** Host action: force-mute a speaker. */
export async function hostMuteParticipant(participantId) {
  const { error } = await supabase.from("room_participants").update({ muted: true }).eq("id", participantId);
  return { error };
}

/** Host action: remove a participant from the room entirely. */
export async function removeParticipant(participantId) {
  const { error } = await supabase
    .from("room_participants")
    .update({ left_at: new Date().toISOString(), hand_raised: false })
    .eq("id", participantId);
  return { error };
}

const MESSAGE_SELECT = "*, profile:user_id (id, username, display_name, avatar_url)";

/** Most recent chat messages for a room, oldest first (for a scrollback view). */
export async function listRoomMessages(roomId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("room_messages")
    .select(MESSAGE_SELECT)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data ?? []).reverse(), error };
}

export async function sendRoomMessage(roomId, userId, content) {
  const trimmed = content.trim();
  if (!trimmed) return { data: null, error: null };
  const { data, error } = await supabase
    .from("room_messages")
    .insert({ room_id: roomId, user_id: userId, content: trimmed })
    .select(MESSAGE_SELECT)
    .single();
  return { data, error };
}

/**
 * Subscribe to everything that changes live in a room: the room row itself
 * (status → ended), participants joining/updating/leaving, and new chat
 * messages. Returns an unsubscribe function.
 */
export function subscribeToRoom(roomId, { onRoomUpdate, onParticipantChange, onMessage }) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      (payload) => onRoomUpdate?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
      (payload) => onParticipantChange?.(payload)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
      (payload) => onMessage?.(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/** Subscribe to the live rooms list (for the browse/lobby page). */
export function subscribeToRoomsList({ onInsert, onUpdate }) {
  const channel = supabase
    .channel("rooms:lobby")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms" }, (payload) => onInsert?.(payload.new))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms" }, (payload) => onUpdate?.(payload.new))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
