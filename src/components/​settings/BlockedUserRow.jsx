import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "../profile/Avatar.jsx";

export default function BlockedUserRow({ user, onUnblock, unblocking }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
      <Link to={`/u/${user.username}`} className="flex items-center gap-3 min-w-0">
        <Avatar src={user.avatar_url} name={user.display_name || user.username} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {user.display_name || user.username}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onUnblock(user.id)}
        disabled={unblocking}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {unblocking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Unblock
      </button>
    </div>
  );
}
