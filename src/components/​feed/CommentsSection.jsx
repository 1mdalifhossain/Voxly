import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import CommentComposer from "./CommentComposer.jsx";
import CommentItem from "./CommentItem.jsx";
import { getProfileById } from "../../lib/profiles.js";
import {
  getComments,
  getLikedCommentIds,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  buildCommentTree,
  subscribeToComments,
  subscribeToCommentLikes,
} from "../../lib/comments.js";

export default function CommentsSection({ postId, currentUserId, currentUserProfile }) {
  const [comments, setComments] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const profileCache = useRef(new Map());

  useEffect(() => {
    if (currentUserProfile?.id) profileCache.current.set(currentUserProfile.id, currentUserProfile);
  }, [currentUserProfile]);

  // Initial load.
  useEffect(() => {
    let active = true;
    setLoading(true);

    getComments(postId).then(async ({ data }) => {
      if (!active) return;
      const list = data || [];
      list.forEach((c) => {
        if (c.profiles) profileCache.current.set(c.user_id, c.profiles);
      });
      setComments(list);

      const { data: liked } = await getLikedCommentIds(currentUserId, list.map((c) => c.id));
      if (active) setLikedIds(new Set(liked));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [postId, currentUserId]);

  // Realtime: new/edited/deleted comments.
  useEffect(() => {
    const unsubscribe = subscribeToComments(postId, {
      onInsert: async (row) => {
        let author = profileCache.current.get(row.user_id);
        if (!author) {
          const { data } = await getProfileById(row.user_id);
          author = data;
          if (author) profileCache.current.set(row.user_id, author);
        }
        setComments((prev) => {
          if (prev.some((c) => c.id === row.id)) return prev;
          return [...prev, { ...row, profiles: author, like_count: 0 }];
        });
      },
      onUpdate: (row) => {
        setComments((prev) =>
          prev.map((c) => (c.id === row.id ? { ...c, content: row.content, edited: row.edited, updated_at: row.updated_at } : c))
        );
      },
      onDelete: (row) => {
        setComments((prev) => prev.filter((c) => c.id !== row.id));
      },
    });
    return unsubscribe;
  }, [postId]);

  // Realtime: likes from other users/sessions (our own actions are applied optimistically).
  useEffect(() => {
    const unsubscribe = subscribeToCommentLikes({
      onLike: (row) => {
        if (row.user_id === currentUserId) return;
        setComments((prev) =>
          prev.some((c) => c.id === row.comment_id)
            ? prev.map((c) => (c.id === row.comment_id ? { ...c, like_count: c.like_count + 1 } : c))
            : prev
        );
      },
      onUnlike: (row) => {
        if (row.user_id === currentUserId) return;
        setComments((prev) =>
          prev.some((c) => c.id === row.comment_id)
            ? prev.map((c) => (c.id === row.comment_id ? { ...c, like_count: Math.max(0, c.like_count - 1) } : c))
            : prev
        );
      },
    });
    return unsubscribe;
  }, [currentUserId]);

  const removeWithDescendants = useCallback((list, commentId) => {
    const toRemove = new Set([commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of list) {
        if (c.parent_id && toRemove.has(c.parent_id) && !toRemove.has(c.id)) {
          toRemove.add(c.id);
          changed = true;
        }
      }
    }
    return list.filter((c) => !toRemove.has(c.id));
  }, []);

  const handleTopLevelSubmit = async (content) => {
    const { data, error } = await createComment(postId, currentUserId, { content });
    if (error) return { error };
    profileCache.current.set(currentUserId, data.profiles);
    setComments((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]));
    return { error: null };
  };

  const handleReply = async (parentId, content) => {
    const { data, error } = await createComment(postId, currentUserId, { content, parentId });
    if (error) return { error };
    profileCache.current.set(currentUserId, data.profiles);
    setComments((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]));
    return { error: null };
  };

  const handleEdit = async (commentId, content) => {
    const { data, error } = await updateComment(commentId, currentUserId, content);
    if (error) return { error };
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...data } : c)));
    return { error: null };
  };

  const handleDelete = async (commentId) => {
    const { error } = await deleteComment(commentId, currentUserId);
    if (error) return { error };
    setComments((prev) => removeWithDescendants(prev, commentId));
    return { error: null };
  };

  const handleToggleLike = async (commentId, isLiked) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, like_count: Math.max(0, c.like_count + (isLiked ? -1 : 1)) } : c))
    );

    const { error } = isLiked ? await unlikeComment(commentId, currentUserId) : await likeComment(commentId, currentUserId);

    if (error) {
      // revert on failure
      setLikedIds((prev) => {
        const next = new Set(prev);
        isLiked ? next.add(commentId) : next.delete(commentId);
        return next;
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, like_count: Math.max(0, c.like_count + (isLiked ? 1 : -1)) } : c))
      );
    }
  };

  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 mb-3">
        {loading ? "Loading comments…" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </p>

      {currentUserId && (
        <CommentComposer profile={currentUserProfile} onSubmit={handleTopLevelSubmit} placeholder="Write a comment…" />
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      ) : (
        tree.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            currentUserProfile={currentUserProfile}
            likedIds={likedIds}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleLike={handleToggleLike}
          />
        ))
      )}
    </div>
  );
}
