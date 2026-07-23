import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, X } from "lucide-react";
import Avatar from "./Avatar.jsx";
import FollowButton from "./FollowButton.jsx";
import { getSuggestedUsers } from "../../lib/profiles.js";

/** "People you may know" sidebar widget — suggests accounts the user doesn't already follow. */
export default function SuggestedUsers({ currentUserId, limit = 5, className = "" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSuggestedUsers(currentUserId, limit).then(({ data }) => {
      if (active) {
        setUsers(data || []);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [currentUserId, limit]);

  const visible = users.filter((u) => !dismissed.has(u.id));

  if (!loading && visible.length === 0) return null;

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-brand-600" />
        <h2 className="font-display font-semibold text-slate-900 text-sm">Suggested for you</h2>
      </div>

      {loading ? (
        <ul className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {visible.map((u) => (
            <li key={u.id} className="flex items-center gap-3">
              <Link to={`/u/${u.username}`} className="shrink-0">
                <Avatar src={u.avatar_url} name={u.display_name || u.username} size="sm" />
              </Link>
              <Link to={`/u/${u.username}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{u.display_name || u.username}</p>
                <p className="text-xs text-slate-500 truncate">
                  @{u.username}
                  {u.followers_count > 0 && (
                    <span className="text-slate-400">
                      {" "}
                      · {u.followers_count} follower{u.followers_count === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
              </Link>
              {currentUserId ? (
                <FollowButton
                  currentUserId={currentUserId}
                  targetUserId={u.id}
                  isFollowing={false}
                  onChange={(next) => {
                    if (next) setDismissed((prev) => new Set(prev).add(u.id));
                  }}
                  className="!px-3 !py-1.5 !text-xs shrink-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setDismissed((prev) => new Set(prev).add(u.id))}
                  aria-label="Dismiss suggestion"
                  className="p-1 text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
