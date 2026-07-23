import { useEffect, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { getTrendingHashtags } from "../../lib/posts.js";

export default function TrendingSidebar({ activeHashtag, onSelect }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTrendingHashtags(8).then(({ data }) => {
      if (active) {
        setTags(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-brand-600" />
        <h2 className="font-display font-semibold text-slate-900 text-sm">Trending now</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      ) : tags.length === 0 ? (
        <p className="text-sm text-slate-500">No trending hashtags yet — be the first to post one.</p>
      ) : (
        <ul className="space-y-1">
          {tags.map(({ hashtag, uses }, i) => (
            <li key={hashtag}>
              <button
                type="button"
                onClick={() => onSelect?.(hashtag === activeHashtag ? null : hashtag)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${
                  hashtag === activeHashtag ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-xs text-slate-400">#{i + 1} · Trending</span>
                  <span className="block text-sm font-semibold text-brand-600 truncate">#{hashtag}</span>
                </span>
                <span className="text-xs text-slate-400 shrink-0">{uses} post{uses === 1 ? "" : "s"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
