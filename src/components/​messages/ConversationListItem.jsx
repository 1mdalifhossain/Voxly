import Avatar from "../profile/Avatar.jsx";
import OnlineDot from "./OnlineDot.jsx";
import { formatRelativeTime } from "../../lib/format.js";

/** One row in the inbox: avatar (+ online dot), name, last-message preview, time, unread state. */
export default function ConversationListItem({ otherUser, conversation, unread, online, active, typing, onClick }) {
  const name = otherUser?.display_name || otherUser?.username || "Unknown user";
  const isOwnLastMessage = conversation.last_message_sender_id && otherUser && conversation.last_message_sender_id !== otherUser.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        active ? "bg-brand-50" : "hover:bg-slate-50"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar src={otherUser?.avatar_url} name={name} size="sm" />
        <OnlineDot online={online} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${unread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{name}</p>
          <span className={`text-xs shrink-0 ${unread ? "text-brand-600 font-semibold" : "text-slate-400"}`}>
            {formatRelativeTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${unread ? "text-slate-700" : "text-slate-500"}`}>
            {typing ? <span className="text-brand-600 font-medium">typing…</span> : (
              <>
                {isOwnLastMessage && "You: "}
                {conversation.last_message_preview || "Say hi 👋"}
              </>
            )}
          </p>
          {unread && <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
        </div>
      </div>
    </button>
  );
}
