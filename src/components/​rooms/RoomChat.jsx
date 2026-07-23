import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import { formatRelativeTime } from "../../lib/format.js";
import { sendRoomMessage } from "../../lib/rooms.js";

const MESSAGE_LIMIT = 500;

/**
 * Live text chat alongside the voice room. `messages` and `onIncoming` are
 * owned by the parent page (Room.jsx), which already holds the room's
 * realtime subscription — this component just renders and composes.
 */
export default function RoomChat({ roomId, currentUserId, currentUserProfile, messages, loading }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    await sendRoomMessage(roomId, currentUserId, content);
    setContent("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">
        <MessageCircle className="w-4 h-4 text-slate-400" />
        Room chat
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No messages yet. Say hi!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar
                src={m.profile?.avatar_url}
                name={m.profile?.display_name || m.profile?.username}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {m.profile?.display_name || m.profile?.username}
                  </p>
                  <p className="text-[11px] text-slate-400 shrink-0">{formatRelativeTime(m.created_at)}</p>
                </div>
                <p className="text-sm text-slate-700 break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-slate-100">
        <Avatar
          src={currentUserProfile?.avatar_url}
          name={currentUserProfile?.display_name || currentUserProfile?.username}
          size="sm"
        />
        <div className="flex-1 flex items-center gap-1.5 bg-slate-100 rounded-full pl-3.5 pr-1.5 py-1 focus-within:ring-2 focus-within:ring-brand-500">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MESSAGE_LIMIT))}
            placeholder="Send a message…"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none focus:ring-0 text-sm text-slate-900 placeholder:text-slate-400 py-1"
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            aria-label="Send message"
            className="shrink-0 p-1.5 rounded-full text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
