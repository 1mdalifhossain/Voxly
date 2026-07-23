import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Loader2, ChevronLeft, Users, MessageCircle, X } from "lucide-react";
import LiveIndicator from "../components/rooms/LiveIndicator.jsx";
import RoomTimer from "../components/rooms/RoomTimer.jsx";
import ParticipantsList from "../components/rooms/ParticipantsList.jsx";
import RoomControls from "../components/rooms/RoomControls.jsx";
import RoomChat from "../components/rooms/RoomChat.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { useAgoraRoom } from "../hooks/useAgoraRoom.js";
import {
  getRoom,
  listActiveParticipants,
  joinRoom,
  leaveRoom,
  endRoom,
  setHandRaised,
  setSelfMuted,
  promoteToSpeaker,
  demoteToListener,
  hostMuteParticipant,
  removeParticipant,
  listRoomMessages,
  subscribeToRoom,
} from "../lib/rooms.js";

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ending, setEnding] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  const hasJoinedRef = useRef(false);
  const leftRef = useRef(false);

  const me = participants.find((p) => p.user_id === user?.id);
  const role = me?.role || "listener";
  const muted = me?.muted ?? true;
  const handRaised = me?.hand_raised ?? false;
  const isHostView = role === "host";

  // Load the room, seat the current user as a participant (host is already
  // seated at creation time), and load initial chat scrollback.
  useEffect(() => {
    if (!roomId || !user) return;
    let active = true;

    (async () => {
      setLoading(true);
      const { data: roomData } = await getRoom(roomId);
      if (!active) return;
      if (!roomData || roomData.status === "ended") {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setRoom(roomData);

      const { data: activeParticipants } = await listActiveParticipants(roomId);
      if (!active) return;

      const alreadyIn = activeParticipants.some((p) => p.user_id === user.id);
      if (!alreadyIn && !hasJoinedRef.current) {
        hasJoinedRef.current = true;
        await joinRoom(roomId, user.id);
        const { data: refreshed } = await listActiveParticipants(roomId);
        if (active) setParticipants(refreshed);
      } else {
        setParticipants(activeParticipants);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [roomId, user]);

  // Chat scrollback.
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    setMessagesLoading(true);
    listRoomMessages(roomId).then(({ data }) => {
      if (active) {
        setMessages(data);
        setMessagesLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [roomId]);

  // Live updates: room ending, participants joining/updating/leaving, new chat messages.
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, {
      onRoomUpdate: (updatedRoom) => {
        setRoom(updatedRoom);
        if (updatedRoom.status === "ended") navigate("/rooms", { replace: true });
      },
      onParticipantChange: async ({ eventType, new: newRow, old: oldRow }) => {
        if (eventType === "DELETE") {
          setParticipants((prev) => prev.filter((p) => p.id !== oldRow.id));
          return;
        }
        if (newRow.left_at) {
          setParticipants((prev) => prev.filter((p) => p.id !== newRow.id));
          return;
        }
        const { data: fresh } = await listActiveParticipants(roomId);
        setParticipants(fresh);
      },
      onMessage: (row) => {
        // Realtime payload is the bare row; the initial list load already
        // hydrated profiles, so merge what we have and let a light refetch
        // fill in the sender's profile the first time we see them.
        setMessages((prev) => [...prev, { ...row, profile: prev.find((m) => m.user_id === row.user_id)?.profile }]);
      },
    });
    return unsubscribe;
  }, [roomId, navigate]);

  // Best-effort: mark the participant row as left when navigating away or
  // closing the tab. Doesn't cover a hard crash/force-quit — for that, a
  // server-side presence timeout (e.g. a Supabase cron job clearing stale
  // `joined_at` rows) is the usual belt-and-suspenders complement.
  useEffect(() => {
    const markLeft = () => {
      if (!leftRef.current && user && roomId && role !== "host") {
        leftRef.current = true;
        leaveRoom(roomId, user.id);
      }
    };
    window.addEventListener("beforeunload", markLeft);
    return () => {
      window.removeEventListener("beforeunload", markLeft);
      markLeft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, role]);

  const { speakingUids, connectionError } = useAgoraRoom({
    roomId,
    uid: user?.id,
    canPublish: role === "host" || role === "speaker",
    muted,
  });

  const handleToggleMute = useCallback(() => {
    if (!user) return;
    setSelfMuted(roomId, user.id, !muted);
    setParticipants((prev) => prev.map((p) => (p.user_id === user.id ? { ...p, muted: !muted } : p)));
  }, [roomId, user, muted]);

  const handleToggleHand = useCallback(() => {
    if (!user) return;
    setHandRaised(roomId, user.id, !handRaised);
    setParticipants((prev) => prev.map((p) => (p.user_id === user.id ? { ...p, hand_raised: !handRaised } : p)));
  }, [roomId, user, handRaised]);

  const handleLeaveOrEnd = useCallback(async () => {
    if (!user) return;
    if (isHostView) {
      if (!window.confirm("End this room for everyone?")) return;
      setEnding(true);
      await endRoom(roomId, user.id);
      leftRef.current = true;
      navigate("/rooms", { replace: true });
      return;
    }
    leftRef.current = true;
    await leaveRoom(roomId, user.id);
    navigate("/rooms", { replace: true });
  }, [roomId, user, isHostView, navigate]);

  const handleParticipantAction = useCallback(async (action, participant) => {
    setActionError(null);
    let result;
    if (action === "promote") result = await promoteToSpeaker(participant.id);
    if (action === "demote") result = await demoteToListener(participant.id);
    if (action === "mute") result = await hostMuteParticipant(participant.id);
    if (action === "remove") result = await removeParticipant(participant.id);
    if (result?.error) setActionError(result.error.message || "That action didn't go through.");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-600">This room has ended or doesn't exist.</p>
        <Link to="/rooms" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to Voice Rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/rooms" aria-label="Back to Voice Rooms" className="text-slate-400 hover:text-slate-700 shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-semibold text-slate-900 truncate leading-tight">{room.title}</h1>
            <div className="flex items-center gap-3 text-xs mt-0.5">
              <LiveIndicator size="sm" />
              <RoomTimer startedAt={room.started_at} />
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Users className="w-3.5 h-3.5" />
                {participants.length}
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileChatOpen(true)}
            aria-label="Open room chat"
            className="lg:hidden p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 min-w-0">
          {connectionError && <AlertBanner type="error">{connectionError}</AlertBanner>}
          {actionError && <AlertBanner type="error">{actionError}</AlertBanner>}
          {room.description && <p className="text-sm text-slate-500 mb-6">{room.description}</p>}
          <ParticipantsList
            participants={participants}
            speakingUids={speakingUids}
            isHostView={isHostView}
            onAction={handleParticipantAction}
          />
        </div>

        <aside className="hidden lg:block h-[calc(100vh-14rem)]">
          <RoomChat
            roomId={roomId}
            currentUserId={user?.id}
            currentUserProfile={profile}
            messages={messages}
            loading={messagesLoading}
          />
        </aside>
      </main>

      {mobileChatOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-slate-50">
          <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 bg-white shrink-0">
            <span className="text-sm font-semibold text-slate-900">Room chat</span>
            <button onClick={() => setMobileChatOpen(false)} aria-label="Close chat" className="text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 p-3">
            <RoomChat
              roomId={roomId}
              currentUserId={user?.id}
              currentUserProfile={profile}
              messages={messages}
              loading={messagesLoading}
            />
          </div>
        </div>
      )}

      <div className="sticky bottom-0">
        <RoomControls
          role={role}
          muted={muted}
          handRaised={handRaised}
          ending={ending}
          onToggleMute={handleToggleMute}
          onToggleHand={handleToggleHand}
          onLeaveOrEnd={handleLeaveOrEnd}
        />
      </div>
    </div>
  );
}
