import { useEffect, useState } from "react";
import { X, Loader2, Search as SearchIcon } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import { searchUsers } from "../../lib/search.js";

/** Modal: search for a user by username/name and start (or resume) a DM with them. */
export default function NewConversationModal({ currentUserId, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      const { data } = await searchUsers(trimmed, { limit: 12 });
      setResults((data || []).filter((u) => u.id !== currentUserId));
      setLoading(false);
    }, 250);
    return () => clearTimeout(id);
  }, [query, currentUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/40 px-4 pt-16 sm:pt-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-display font-semibold text-slate-900">New message</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full bg-slate-100 rounded-full pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border-t border-slate-100">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 px-6">
              {query.trim() ? "No one found." : "Search for someone to start a conversation."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(u)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <Avatar src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
