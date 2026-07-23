import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon, X, Loader2, Hash, TrendingUp } from "lucide-react";
import Logo from "../components/Logo.jsx";
import Avatar from "../components/profile/Avatar.jsx";
import FollowButton from "../components/profile/FollowButton.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { searchUsers, searchPosts, searchHashtags } from "../lib/search.js";
import { getFollowingIds } from "../lib/profiles.js";
import { getTrendingHashtags, listTrendingPosts } from "../lib/posts.js";

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "users", label: "Users" },
  { key: "posts", label: "Posts" },
  { key: "hashtags", label: "Hashtags" },
];

const DEBOUNCE_MS = 350;

export default function Search() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [tab, setTab] = useState(searchParams.get("q") ? "posts" : "trending");

  const [users, setUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [posts, setPosts] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(null);

  const debounceRef = useRef(null);
  const requestId = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce the input into a committed `query`, synced to the URL so search is shareable/refreshable.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(inputValue.trim());
      setSearchParams(inputValue.trim() ? { q: inputValue.trim() } : {}, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  // Jump to a sensible tab the moment a query starts/stops.
  useEffect(() => {
    if (query && tab === "trending") setTab("posts");
    if (!query && ["users", "posts", "hashtags"].includes(tab)) setTab("trending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Trending tab — discovery content, independent of the query.
  useEffect(() => {
    if (tab !== "trending") return;
    let active = true;
    getTrendingHashtags(10).then(({ data }) => active && setTrendingHashtags(data || []));
    listTrendingPosts({ pageSize: 6 }).then(({ data }) => active && setTrendingPosts(data || []));
    return () => {
      active = false;
    };
  }, [tab]);

  // Users / Posts / Hashtags tabs — search as the query or active tab changes.
  useEffect(() => {
    if (tab === "trending") return;
    if (!query) {
      setUsers([]);
      setPosts([]);
      setHashtags([]);
      setNextOffset(null);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);

    const run = async () => {
      if (tab === "users") {
        const { data } = await searchUsers(query);
        if (id !== requestId.current) return;
        setUsers(data);
        setNextOffset(data.length === 10 ? 10 : null);
        if (user?.id && data.length) {
          const { data: ids } = await getFollowingIds(user.id, data.map((u) => u.id));
          if (id === requestId.current) setFollowingIds(new Set(ids));
        }
      } else if (tab === "posts") {
        const { data } = await searchPosts(query);
        if (id !== requestId.current) return;
        setPosts(data);
        setNextOffset(data.length === 10 ? 10 : null);
      } else if (tab === "hashtags") {
        const { data } = await searchHashtags(query);
        if (id !== requestId.current) return;
        setHashtags(data);
        setNextOffset(data.length === 10 ? 10 : null);
      }
      if (id === requestId.current) setLoading(false);
    };
    run();
  }, [tab, query, user?.id]);

  const loadMore = useCallback(async () => {
    if (loadingMore || nextOffset == null) return;
    setLoadingMore(true);
    if (tab === "users") {
      const { data } = await searchUsers(query, { offset: nextOffset });
      setUsers((prev) => [...prev, ...data]);
      setNextOffset(data.length === 10 ? nextOffset + 10 : null);
      if (user?.id && data.length) {
        const { data: ids } = await getFollowingIds(user.id, data.map((u) => u.id));
        setFollowingIds((prev) => new Set([...prev, ...ids]));
      }
    } else if (tab === "posts") {
      const { data } = await searchPosts(query, { offset: nextOffset });
      setPosts((prev) => [...prev, ...data]);
      setNextOffset(data.length === 10 ? nextOffset + 10 : null);
    } else if (tab === "hashtags") {
      const { data } = await searchHashtags(query, { offset: nextOffset });
      setHashtags((prev) => [...prev, ...data]);
      setNextOffset(data.length === 10 ? nextOffset + 10 : null);
    }
    setLoadingMore(false);
  }, [loadingMore, nextOffset, tab, query, user?.id]);

  const goToHashtag = (tag) => navigate(`/dashboard?hashtag=${encodeURIComponent(tag)}`);

  const clearInput = () => {
    setInputValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="shrink-0 p-2 -ml-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1 min-w-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              type="text"
              placeholder="Search Voxly"
              className="w-full bg-slate-100 rounded-full pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {inputValue && (
              <button
                onClick={clearInput}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 shrink-0">
            <Logo className="w-6 h-6" />
          </Link>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex gap-1 bg-slate-100 rounded-full p-1 w-fit overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors ${
                  tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {tab === "trending" && (
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <h2 className="font-display font-semibold text-slate-900 text-sm">Trending hashtags</h2>
              </div>
              {trendingHashtags.length === 0 ? (
                <p className="text-sm text-slate-500">No trending hashtags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map(({ hashtag, uses }) => (
                    <button
                      key={hashtag}
                      onClick={() => goToHashtag(hashtag)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 bg-white border border-slate-100 shadow-sm px-3.5 py-1.5 rounded-full hover:bg-brand-50 transition-colors"
                    >
                      #{hashtag}
                      <span className="text-xs font-normal text-slate-400">{uses}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <h2 className="font-display font-semibold text-slate-900 text-sm">Trending posts</h2>
              </div>
              {trendingPosts.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing trending yet — check back soon.</p>
              ) : (
                <div className="space-y-4">
                  {trendingPosts.map((post) => (
                    <PostCard key={post.id} post={post} currentUserId={user?.id} currentUserProfile={profile} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab !== "trending" && !query && (
          <p className="text-sm text-slate-500 text-center py-16">
            Start typing to search {tab === "users" ? "people" : tab === "posts" ? "posts" : "hashtags"}.
          </p>
        )}

        {tab !== "trending" && query && loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {tab === "users" && query && !loading && (
          <>
            {users.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-16">No users found for "{query}".</p>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => (
                  <li key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
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
                      {u.bio && <p className="text-xs text-slate-500 truncate mt-0.5">{u.bio}</p>}
                    </Link>
                    {user?.id && user.id !== u.id && (
                      <FollowButton
                        currentUserId={user.id}
                        targetUserId={u.id}
                        isFollowing={followingIds.has(u.id)}
                        onChange={(next) =>
                          setFollowingIds((prev) => {
                            const copy = new Set(prev);
                            if (next) copy.add(u.id);
                            else copy.delete(u.id);
                            return copy;
                          })
                        }
                        className="!px-3 !py-1.5 !text-xs shrink-0"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "posts" && query && !loading && (
          <>
            {posts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-16">No posts found for "{query}".</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} currentUserProfile={profile} onHashtagClick={goToHashtag} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "hashtags" && query && !loading && (
          <>
            {hashtags.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-16">No hashtags found for "{query}".</p>
            ) : (
              <ul className="space-y-2">
                {hashtags.map(({ hashtag, uses }) => (
                  <li key={hashtag}>
                    <button
                      onClick={() => goToHashtag(hashtag)}
                      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <Hash className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">#{hashtag}</span>
                        <span className="block text-xs text-slate-500">
                          {uses} post{uses === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {nextOffset != null && tab !== "trending" && query && (users.length > 0 || posts.length > 0 || hashtags.length > 0) && (
          <div className="flex justify-center py-5">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-60"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
