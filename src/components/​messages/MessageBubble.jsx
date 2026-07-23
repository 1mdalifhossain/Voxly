import { Check, CheckCheck } from "lucide-react";
import VoicePlayer from "./VoicePlayer.jsx";
import { formatRelativeTime } from "../../lib/format.js";

/**
 * One message bubble. `status` (only meaningful for the current user's own
 * messages) drives the little check-mark: "sent" (one grey check) vs "seen"
 * (two brand-colored checks), mirroring the familiar chat-app convention.
 */
export default function MessageBubble({ message, isOwn, status }) {
  const bubbleBase = "max-w-[75%] sm:max-w-[65%] rounded-2xl px-3.5 py-2.5";
  const ownStyle = "bg-brand-600 text-white rounded-br-md";
  const otherStyle = "bg-slate-100 text-slate-800 rounded-bl-md";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`${bubbleBase} ${isOwn ? ownStyle : otherStyle}`}>
        {message.image_url && (
          <img
            src={message.image_url}
            alt="Shared"
            className={`rounded-xl max-w-full max-h-72 object-cover ${message.content ? "mb-2" : ""}`}
            loading="lazy"
          />
        )}

        {message.voice_url && (
          <div className={message.content ? "mb-2" : ""}>
            <VoicePlayer src={message.voice_url} duration={message.voice_duration} tone={isOwn ? "dark" : "light"} />
          </div>
        )}

        {message.content && <p className="text-sm leading-snug whitespace-pre-wrap break-words">{message.content}</p>}

        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          <span className={`text-[11px] ${isOwn ? "text-white/70" : "text-slate-400"}`}>
            {formatRelativeTime(message.created_at)}
          </span>
          {isOwn && status === "seen" && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
          {isOwn && status === "sent" && <Check className="w-3.5 h-3.5 text-white/70" />}
        </div>
      </div>
    </div>
  );
}
