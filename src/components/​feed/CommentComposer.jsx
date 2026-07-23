import { useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import { COMMENT_MAX_LENGTH } from "../../lib/comments.js";

export default function CommentComposer({
  profile,
  placeholder = "Write a comment…",
  autoFocus = false,
  size = "md",
  onSubmit,
  onCancel,
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const canSubmit = content.trim().length > 0 && content.length <= COMMENT_MAX_LENGTH && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    const result = await onSubmit(content);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error.message || "Couldn't post your comment.");
      return;
    }
    setContent("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === "Escape") onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2.5">
      <Avatar src={profile?.avatar_url} name={profile?.display_name || profile?.username} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-3.5 pr-1.5 py-1 focus-within:ring-2 focus-within:ring-brand-500">
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={COMMENT_MAX_LENGTH + 100}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none focus:ring-0 text-sm text-slate-900 placeholder:text-slate-400 py-1"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send comment"
            className="shrink-0 p-1.5 rounded-full text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1 ml-3.5">{error}</p>}
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 mt-1 ml-3.5">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
