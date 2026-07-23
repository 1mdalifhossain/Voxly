import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import CommentComposer from "./CommentComposer.jsx";
import { formatRelativeTime } from "../../lib/format.js";
import { COMMENT_MAX_LENGTH } from "../../lib/comments.js";

const MAX_VISUAL_DEPTH = 5;

export default function CommentItem({
  comment,
  depth = 0,
  currentUserId,
  currentUserProfile,
  likedIds,
  onReply,
  onEdit,
  onDelete,
  onToggleLike,
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const author = comment.profiles || {};
  const isOwner = currentUserId && currentUserId === comment.user_id;
  const isLiked = likedIds?.has(comment.id);
  const indent = Math.min(depth, MAX_VISUAL_DEPTH);

  const handleReplySubmit = async (content) => {
    const result = await onReply(comment.id, content);
    if (!result?.error) setReplying(false);
    return result;
  };

  const saveEdit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    setError("");
    const result = await onEdit(comment.id, draft);
    setSaving(false);
    if (result?.error) {
      setError(result.error.message || "Couldn't save changes.");
      return;
    }
    setEditing(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const result = await onDelete(comment.id);
    setDeleting(false);
    if (result?.error) {
      setError(result.error.message || "Couldn't delete this comment.");
      return;
    }
  };

  return (
    <div className={indent > 0 ? "mt-3" : "mt-4"} style={{ marginLeft: indent * 20 }}>
      <div className="flex items-start gap-2.5">
        <Link to={`/u/${author.username}`} className="shrink-0">
          <Avatar src={author.avatar_url} name={author.display_name || author.username} size="sm" />
        </Link>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={COMMENT_MAX_LENGTH + 100}
                className="w-full bg-slate-100 rounded-full px-3.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
              {error && <p className="text-xs text-red-600 mt-1 ml-1">{error}</p>}
              <div className="flex items-center gap-3 mt-1 ml-1">
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(comment.content);
                    setError("");
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-2xl px-3.5 py-2 inline-block max-w-full">
              <Link to={`/u/${author.username}`} className="text-xs font-semibold text-slate-900 hover:underline">
                {author.display_name || author.username}
              </Link>
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
          )}

          {!editing && (
            <div className="flex items-center gap-3.5 mt-1 ml-1">
              <span className="text-xs text-slate-400">
                {formatRelativeTime(comment.created_at)}
                {comment.edited && " · edited"}
              </span>
              <button
                onClick={() => onToggleLike(comment.id, isLiked)}
                className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                  isLiked ? "text-red-500" : "text-slate-500 hover:text-red-500"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-red-500" : ""}`} />
                {comment.like_count > 0 && comment.like_count}
              </button>
              <button
                onClick={() => setReplying((r) => !r)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Reply
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  {confirmingDelete ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Delete?</span>
                      <button
                        onClick={confirmDelete}
                        disabled={deleting}
                        className="font-semibold text-red-600 hover:text-red-700"
                      >
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                      </button>
                      <button onClick={() => setConfirmingDelete(false)} className="text-slate-500 hover:text-slate-700">
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmingDelete(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {error && !editing && <p className="text-xs text-red-600 mt-1 ml-1">{error}</p>}

          {replying && (
            <div className="mt-2">
              <CommentComposer
                profile={currentUserProfile}
                placeholder={`Reply to ${author.display_name || author.username}…`}
                autoFocus
                size="sm"
                onSubmit={handleReplySubmit}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>

      {comment.replies?.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              likedIds={likedIds}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}
