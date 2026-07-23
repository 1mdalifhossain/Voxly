import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Loader2 } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { listFollowers, listFollowing, getProfileById, subscribeToFollows } from "../../lib/profiles.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

/**
 * Modal with "Followers" / "Following" tabs for a given user.
 * `initialTab` controls which list opens first. Updates live while open.
 */
export default function FollowListModal({ userId, initialTab = "followers", onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEscapeKey(onClose);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const fetcher = tab === "followers" ? listFollowers : listFollowing;
    fetcher(userId).then(({ data }) => {
      if (active) {
        setUsers(data || []);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [tab, userId]);

  // Live updates while the modal is open — someone follows/unfollows elsewhere.
  useEffect(() => {
    const unsubscribe = subscribeToFollows(userId, {
      onFollowerChange: async (delta, row) => {
        if (tab !== "followers") return;
        if (delta > 0) {
          const { data: profile } = await getProfileById(row.follower_id);
          if (profile) setUsers((prev) => (prev.some((u) => u.id === profile.id) ? prev : [profile, ...prev]));
        } else {
          setUsers((prev) => prev.filter((u) => u.id !== row.follower_id));
        }
      },
      onFollowingChange: async (delta, row) => {
        if (tab !== "following") return;
        if (delta > 0) {
          const { data: profile } = await getProfileById(row.following_id);
          if (profile) setUsers((prev) => (prev.some((u) => u.id === profile.id) ? prev : [profile, ...prev]));
        } else {
          setUsers((prev) => prev.filter((u) => u.id !== row.following_id));
        }
      },
    });
    return unsubscribe;
  }, [userId, tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex gap-1 bg-slate-100 rounded-full p-1">
            {["followers", "following"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm font-medium px-3.5 py-1.5 rounded-full capitalize transition-colors ${
                  tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
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
            <p className="text-sm text-slate-500 text-center py-10 px-6">
              {tab === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
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
