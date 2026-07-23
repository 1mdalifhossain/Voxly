import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  MessageCircle,
  Heart,
} from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import CommentsSection from "./CommentsSection.jsx";
import LikersModal from "./LikersModal.jsx";
import { splitContentByHashtags, updatePost, deletePost } from "../../lib/posts.js";
import { getPostLikeStatus, likePost, unlikePost, subscribeToPostLikes } from "../../lib/likes.js";
import { formatRelativeTime } from "../../lib/format.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const DOUBLE_TAP_MS = 300;
const BURST_MS = 850;

/** Renders post text with #hashtags highlighted and clickable. */
function PostText({ content, onHashtagClick }) {
  const segments = splitContentByHashtags(content);
  return (
    <p className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap break-words">
      {segments.map((seg, i) =>
        seg.type === "hashtag" ? (
          <button
            key={i}
            type="button"
            onClick={() => onHashtagClick?.(seg.value)}
            className="text-brand-600 font-medium hover:underline"
          >
            #{seg.value}
          </button>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </p>
  );
}

export default function PostCard({ post, currentUserId, currentUserProfile, onHashtagClick, onUpdated, onDeleted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeKey(() => setMenuOpen(false), menuOpen);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [draftRemoveImage, setDraftRemoveImage] = useState(false);
  const [draftImageFile, setDraftImageFile] = useState(null);
  const [draftImagePreview, setDraftImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const fileInputRef = useRef(null);

  // --- Likes -----------------------------------------------------------
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [likersOpen, setLikersOpen] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const lastTapRef = useRef(0);
  const burstTimeoutRef = useRef(null);

  useEffect(() => {
    setLikeCount(post.like_count ?? 0);
  }, [post.like_count]);

  // Whether the current user has already liked this post.
  useEffect(() => {
    let active = true;
    if (!currentUserId) {
      setIsLiked(false);
      return;
    }
    getPostLikeStatus(post.id, currentUserId).then(({ liked }) => {
      if (active) setIsLiked(liked);
    });
    return () => {
      active = false;
    };
  }, [post.id, currentUserId]);

  // Real-time: likes/unlikes from other users/sessions land here instantly.
  // Our own actions are applied optimistically in toggleLike.
  useEffect(() => {
    const unsubscribe = subscribeToPostLikes(post.id, {
      onLike: (row) => {
        if (row.user_id === currentUserId) return;
        setLikeCount((c) => c + 1);
      },
      onUnlike: (row) => {
        if (row.user_id === currentUserId) return;
        setLikeCount((c) => Math.max(0, c - 1));
      },
    });
    return unsubscribe;
  }, [post.id, currentUserId]);

  useEffect(() => () => clearTimeout(burstTimeoutRef.current), []);

  const triggerBurst = () => {
    setShowBurst(false);
    // Force a reflow so re-adding the class restarts the CSS animation.
    requestAnimationFrame(() => setShowBurst(true));
    clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = setTimeout(() => setShowBurst(false), BURST_MS);
  };

  const toggleLike = async () => {
    if (!currentUserId) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    const { error: err } = wasLiked
      ? await unlikePost(post.id, currentUserId)
      : await likePost(post.id, currentUserId);

    if (err) {
      // revert on failure
      setIsLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
    }
  };

  /** Instagram-style double tap on the media/content: always likes (never unlikes) and shows a heart burst. */
  const handleDoubleTapArea = () => {
    if (!currentUserId) return;
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < DOUBLE_TAP_MS;
    lastTapRef.current = now;
    if (!isDoubleTap) return;

    triggerBurst();
    if (!isLiked) toggleLike();
  };

  const author = post.profiles || {};
  const isOwner = currentUserId && currentUserId === post.user_id;
  const displayImage = draftImagePreview || (!draftRemoveImage ? post.image_url : null);

  const startEdit = () => {
    setDraft(post.content);
    setDraftRemoveImage(false);
    setDraftImageFile(null);
    setDraftImagePreview(null);
    setError("");
    setEditing(true);
    setMenuOpen(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
    if (draftImagePreview) URL.revokeObjectURL(draftImagePreview);
  };

  const handleDraftImagePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDraftImageFile(file);
    setDraftImagePreview(URL.createObjectURL(file));
    setDraftRemoveImage(false);
  };

  const saveEdit = async () => {
    if (!draft.trim() && !displayImage) {
      setError("A post needs some text or an image.");
      return;
    }
    setSaving(true);
    setError("");
    const { data, error: err } = await updatePost(post.id, currentUserId, {
      content: draft,
      imageFile: draftImageFile,
      removeImage: draftRemoveImage && !draftImageFile,
    });
    setSaving(false);
    if (err) {
      setError(err.message || "Couldn't save changes.");
      return;
    }
    onUpdated?.({ ...post, ...data, profiles: post.profiles });
    setEditing(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const { error: err } = await deletePost(post.id, currentUserId);
    setDeleting(false);
    if (err) {
      setError(err.message || "Couldn't delete this post.");
      return;
    }
    onDeleted?.(post.id);
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/u/${author.username}`} className="flex items-center gap-3 min-w-0">
          <Avatar src={author.avatar_url} name={author.display_name || author.username} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{author.display_name || author.username}</p>
            <p className="text-xs text-slate-500 truncate">
              @{author.username} · {formatRelativeTime(post.created_at)}
              {post.edited && <span className="text-slate-400"> · edited</span>}
            </p>
          </div>
        </Link>

        {isOwner && !editing && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              aria-label="Post options"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 z-20 mt-1 w-36 bg-white rounded-xl border border-slate-100 shadow-lg py-1">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmingDelete(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        {editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={2200}
              className="w-full resize-none border border-slate-200 rounded-xl p-3 text-[15px] text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />

            {displayImage && (
              <div className="relative mt-2 inline-block max-w-full">
                <img src={displayImage} alt="Post image" className="max-h-64 rounded-xl border border-slate-100 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setDraftRemoveImage(true);
                    if (draftImagePreview) URL.revokeObjectURL(draftImagePreview);
                    setDraftImageFile(null);
                    setDraftImagePreview(null);
                  }}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 bg-slate-900/70 text-white rounded-full p-1 hover:bg-slate-900 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            <div className="flex items-center justify-between mt-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full text-brand-600 hover:bg-brand-50 transition-colors"
                aria-label="Change image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleDraftImagePick}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-brand-600 px-3.5 py-1.5 rounded-full hover:bg-brand-700 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div onClick={handleDoubleTapArea} className="cursor-default select-none">
            {post.content && <PostText content={post.content} onHashtagClick={onHashtagClick} />}
            {post.image_url && (
              <div className="relative mt-3">
                <img
                  src={post.image_url}
                  alt="Post attachment"
                  draggable={false}
                  className="w-full max-h-[480px] object-cover rounded-xl border border-slate-100"
                />
                {showBurst && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Heart className="w-24 h-24 text-white fill-red-500 drop-shadow-lg animate-heartBurst" />
                  </div>
                )}
              </div>
            )}
            {!post.image_url && showBurst && (
              <div className="flex items-center justify-center pointer-events-none py-2">
                <Heart className="w-16 h-16 text-red-500 fill-red-500 animate-heartBurst" />
              </div>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="mt-3 -ml-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLike}
            disabled={!currentUserId}
            aria-pressed={isLiked}
            aria-label={isLiked ? "Unlike" : "Like"}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-1.5 py-1 rounded-full transition-colors disabled:opacity-60 ${
              isLiked ? "text-red-500" : "text-slate-500 hover:text-red-500"
            }`}
          >
            <Heart className={`w-4 h-4 transition-transform ${isLiked ? "fill-red-500 scale-110" : ""}`} />
            Like
          </button>

          {likeCount > 0 && (
            <button
              type="button"
              onClick={() => setLikersOpen(true)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline transition-colors px-1.5 py-1"
            >
              {likeCount} like{likeCount === 1 ? "" : "s"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setCommentsOpen((s) => !s)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-1.5 py-1 rounded-full transition-colors ml-1 ${
              commentsOpen ? "text-brand-600" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {commentsOpen ? "Hide comments" : "Comments"}
          </button>
        </div>
      )}

      {commentsOpen && (
        <CommentsSection postId={post.id} currentUserId={currentUserId} currentUserProfile={currentUserProfile} />
      )}

      {likersOpen && <LikersModal postId={post.id} onClose={() => setLikersOpen(false)} />}

      {confirmingDelete && (
        <div className="mt-3 flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
          <p className="text-sm text-red-700">Delete this post? This can't be undone.</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="text-sm font-medium text-slate-600 px-2.5 py-1 rounded-full hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-red-600 px-3 py-1 rounded-full hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      )}
      {error && !editing && !confirmingDelete && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </article>
  );
}
