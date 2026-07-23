import { useState } from "react";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { followUser, unfollowUser } from "../../lib/profiles.js";

/**
 * Optimistic follow/unfollow toggle. `isFollowing` is the initial state;
 * `onChange(nextIsFollowing)` is called after every successful toggle so the
 * parent can update follower counts.
 */
export default function FollowButton({ currentUserId, targetUserId, isFollowing: initial, onChange, className = "" }) {
  const [isFollowing, setIsFollowing] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const next = !isFollowing;
    setIsFollowing(next); // optimistic

    const { error } = next
      ? await followUser(currentUserId, targetUserId)
      : await unfollowUser(currentUserId, targetUserId);

    setLoading(false);

    if (error) {
      setIsFollowing(!next); // revert on failure
      return;
    }
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-60 ${
        isFollowing
          ? "bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-600"
          : "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {isFollowing ? (hovering ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
