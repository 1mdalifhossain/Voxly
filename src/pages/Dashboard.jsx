import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, X, Loader2, Search as SearchIcon, Mic, Settings as SettingsIcon } from "lucide-react";
import Logo from "../components/Logo.jsx";
import Avatar from "../components/profile/Avatar.jsx";
import PostComposer from "../components/feed/PostComposer.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import TrendingSidebar from "../components/feed/TrendingSidebar.jsx";
import SuggestedUsers from "../components/profile/SuggestedUsers.jsx";
import NotificationBell from "../components/notifications/NotificationBell.jsx";
import MessagesNavLink from "../components/messages/MessagesNavLink.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { listRecentPosts, listTrendingPosts } from "../lib/posts.js";

const TABS = [
  { key: "recent", label: "Recent" },
  { key: "trending", label: "Trending" },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loggingOut, setLoggingOut] = useState(false);
  const [tab, setTab] = useState("recent");
  const [hashtag, setHashtag] = useState(searchParams.get("hashtag") || null);

  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null); // recent: created_at string | trending: numeric offset
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef(null);
  const requestId = useRef(0);

  // Keep local state in sync if the URL's ?hashtag= changes (e.g. arriving from Search).
  useEffect(() => {
    const fromUrl = searchParams.get("hashtag");
    setHashtag((current) => (fromUrl !== current ? fromUrl : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setHashtagAndSync = useCallback(
    (tag) => {
      setHashtag(tag);
      setSearchParams(tag ? { hashtag: tag } : {}, { replace: true });
    },
    [setSearchParams]
  );

  const fetchPage = useCallback(
    async (currentTab, currentHashtag, currentCursor) => {
      if (currentTab === "trending") {
        return listTrendingPosts({ offset: currentCursor || 0, hashtag: currentHashtag });
      }
      return listRecentPosts({ cursor: currentCursor, hashtag: currentHashtag });
    },
    []
  );

  // Reset & load first page whenever the tab or hashtag filter changes.
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setPosts([]);
    setHasMore(true);
    setCursor(null);

    fetchPage(tab, hashtag, null).then(({ data, nextCursor, nextOffset }) => {
      if (id !== requestId.current) return;
      setPosts(data || []);
      const next = tab === "trending" ? nextOffset : nextCursor;
      setCursor(next);
      setHasMore(next != null);
      setLoading(false);
    });
  }, [tab, hashtag, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    const id = requestId.current;
    const { data, nextCursor, nextOffset } = await fetchPage(tab, hashtag, cursor);
    if (id !== requestId.current) return;
    setPosts((prev) => [...prev, ...(data || [])]);
    const next = tab === "trending" ? nextOffset : nextCursor;
    setCursor(next);
    setHasMore(next != null);
    setLoadingMore(false);
  }, [loadingMore, loading, hasMore, tab, hashtag, cursor, fetchPage]);

  // Infinite scroll via IntersectionObserver on a bottom sentinel.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handlePostCreated = (post) => {
    if (tab === "recent" && !hashtag) setPosts((prev) => [post, ...prev]);
  };

  const handlePostUpdated = (updated) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-lg text-slate-900">Voxly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/search"
              aria-label="Search"
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <SearchIcon className="w-5 h-5" />
            </Link>
            <Link
              to="/rooms"
              aria-label="Voice Rooms"
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Mic className="w-5 h-5" />
            </Link>
            <MessagesNavLink currentUserId={user?.id} />
            <NotificationBell currentUserId={user?.id} />
            <Link
              to="/settings"
              aria-label="Settings"
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
            </Link>
            {profile && (
              <Link to={`/u/${profile.username}`} className="hidden sm:block">
                <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="sm" />
              </Link>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{loggingOut ? "Logging out…" : "Log out"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <PostComposer userId={user?.id} profile={profile} onPostCreated={handlePostCreated} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-slate-100 rounded-full p-1 w-fit">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                    tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {hashtag && (
              <button
                onClick={() => setHashtagAndSync(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors"
              >
                #{hashtag}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Trending & suggested-users widgets inline on small screens, where the sidebar is hidden */}
          <div className="lg:hidden mb-5 space-y-5">
            <TrendingSidebar activeHashtag={hashtag} onSelect={setHashtagAndSync} />
            <SuggestedUsers currentUserId={user?.id} />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <p className="text-slate-500 text-sm">
                {hashtag
                  ? `No posts tagged #${hashtag} yet.`
                  : tab === "trending"
                  ? "Nothing trending yet — check back soon."
                  : "No posts yet. Be the first to share something!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  currentUserProfile={profile}
                  onHashtagClick={setHashtagAndSync}
                  onUpdated={handlePostUpdated}
                  onDeleted={handlePostDeleted}
                />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
            {!hasMore && posts.length > 0 && <p className="text-xs text-slate-400">You're all caught up.</p>}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <TrendingSidebar activeHashtag={hashtag} onSelect={setHashtagAndSync} />
            <SuggestedUsers currentUserId={user?.id} />
          </div>
        </aside>
      </main>
    </div>
  );
}
