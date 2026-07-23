import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { listConversations, subscribeToInbox, isUnread } from "../../lib/messages.js";

/** Header icon linking to the inbox, with a badge for how many threads have unread messages. */
export default function MessagesNavLink({ currentUserId }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!currentUserId) return;
    listConversations().then(({ data }) => setConversations(data || []));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToInbox({
      onConversationChange: (row) => {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === row.id);
          if (idx === -1) return prev; // full row (with participants) not needed just for the badge
          const next = [...prev];
          next[idx] = { ...next[idx], ...row };
          return next;
        });
      },
      onParticipantChange: (row) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === row.conversation_id
              ? { ...c, participants: c.participants.map((p) => (p.user_id === row.user_id ? { ...p, ...row } : p)) }
              : c
          )
        );
      },
    });
    return unsubscribe;
  }, [currentUserId]);

  const unreadCount = conversations.filter((c) => isUnread(c, currentUserId)).length;

  if (!currentUserId) return null;

  return (
    <Link
      to="/messages"
      aria-label="Messages"
      className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
