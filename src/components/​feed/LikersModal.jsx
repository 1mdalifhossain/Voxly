import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Loader2, Heart } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import { getPostLikers, subscribeToPostLikes } from "../../lib/likes.js";
import { getProfileById } from "../../lib/profiles.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

/** Modal listing everyone who has liked a post, newest first, updating live. */
export default function LikersModal({ postId, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEscapeKey(onClose);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPostLikers(postId).then(({ data }) => {
      if (active) {
        setUsers(data || []);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [postId]);

  // Live updates while the modal is open — someone likes/unlikes elsewhere.
  useEffect(() => {
    const unsubscribe = subscribeToPostLikes(postId, {
      onLike: async (row) => {
        const { data: profile } = await getProfileById(row.user_id);
        if (!profile) return;
        setUsers((prev) => (prev.some((u) => u.id === profile.id) ? prev : [profile, ...prev]));
      },
      onUnlike: (row) => {
        setUsers((prev) => prev.filter((u) => u.id !== row.user_id));
      },
    });
    return unsubscribe;
  }, [postId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Liked by"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            Liked by
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10 px-6">No likes yet.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {users.map((u) => (
                <li key={u.id}>
                  <Link
                    to={`/u/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <Avatar src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {u.display_name || u.username}
                      </p>
                      <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
