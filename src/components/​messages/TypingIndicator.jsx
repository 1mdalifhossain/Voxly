/** "X is typing…" bubble with three bouncing dots, styled like an incoming message bubble. */
export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
    </div>
  );
}
