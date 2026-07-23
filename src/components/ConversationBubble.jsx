import { Heart, Repeat2 } from "lucide-react";

export default function ConversationBubble({ name, initials, time, text, likes, className, color }) {
  return (
    <div
      className={`absolute w-64 bg-white rounded-2xl rounded-tl-sm shadow-xl shadow-brand-900/10 border border-slate-100 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-[11px] font-semibold text-white font-body`}>
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-slate-800 font-body">{name}</p>
          <p className="text-[10px] text-slate-400 font-body">{time}</p>
        </div>
      </div>
      <p className="text-[13px] text-slate-600 font-body leading-snug">{text}</p>
      <div className="flex items-center gap-3 mt-2 text-slate-400">
        <span className="flex items-center gap-1 text-[11px]">
          <Heart className="w-3 h-3" /> {likes}
        </span>
        <span className="flex items-center gap-1 text-[11px]">
          <Repeat2 className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
