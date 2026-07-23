import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Pencil, LogOut, Search as SearchIcon, MessageCircle, MoreVertical, UserX } from "lucide-react";
import Logo from "../components/Logo.jsx";
import Avatar from "../components/profile/Avatar.jsx";
import CoverPhoto from "../components/profile/CoverPhoto.jsx";
import SocialLinks from "../components/profile/SocialLinks.jsx";
import FollowButton from "../components/profile/FollowButton.jsx";
import FollowListModal from "../components/profile/FollowListModal.jsx";
import LoadingScreen from "../components/auth/LoadingScreen.jsx";
import NotificationBell from "../components/notifications/NotificationBell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getProfileByUsername, getFollowStatus, getFollowCounts, subscribeToFollows } from "../lib/profiles.js";
import { getOrCreateConversation } from "../lib/messages.js";
import { isBlockedByMe, blockUser, unblockUser } from "../lib/settings.js";

const formatJoinDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";

export default function Profile() {
  const { username } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [modalTab, setModalTab] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const isOwnProfile = !!profile && !!user && profile.id === user.id;

  const handleMessage = async () => {
    const { conversationId } = await getOrCreateConversation(profile.id);
    if (conversationId) navigate(`/messages/${conversationId}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const { data } = await getProfileByUsername(username);
    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProfile(data);

    const [countsResult, followResult, blockResult] = await Promise.all([
      getFollowCounts(data.id),
      user && user.id !== data.id ? getFollowStatus(user.id, data.id) : Promise.resolve({ isFollowing: false }),
      user && user.id !== data.id ? isBlockedByMe(user.id, data.id) : Promise.resolve({ isBlocked: false }),
    ]);
    setCounts({ followers: countsResult.followers, following: countsResult.following });
    setIsFollowing(followResult.isFollowing);
    setIsBlocked(blockResult.isBlocked);
    setLoading(false);
  }, [username, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: someone else follows/unfollows this profile while it's open.
  useEffect(() => {
    if (!profile?.id) return;
    const unsubscribe = subscribeToFollows(profile.id, {
      onFollowerChange: (delta, row) => {
        // The viewer's own follow/unfollow is already applied optimistically
        // by FollowButton's onChange below — skip it here to avoid double-counting.
        if (user && row.follower_id === user.id) return;
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + delta) }));
      },
      onFollowingChange: (delta) => {
        setCounts((c) => ({ ...c, following: Math.max(0, c.following + delta) }));
      },
    });
    return unsubscribe;
  }, [profile?.id, user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleToggleBlock = async () => {
    setMenuOpen(false);
    setBlocking(true);
    if (isBlocked) {
      const { error } = await unblockUser(user.id, profile.id);
      if (!error) setIsBlocked(false);
    } else {
      const { error } = await blockUser(user.id, profile.id);
      if (!error) {
        setIsBlocked(true);
        setIsFollowing(false);
      }
    }
    setBlocking(false);
  };

  if (loading) return <LoadingScreen />;

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <Logo className="w-10 h-10" />
        <h1 className="font-display text-xl font-semibold text-slate-900">Profile not found</h1>
        <p className="text-sm text-slate-500">There's no Voxly account with the username "@{username}".</p>
        <Link to="/dashboard" className="text-sm font-medium text-brand-600 hover:text-brand-700 mt-2">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <span className="font-display font-semibold text-slate-900">Voxly</span>
          </div>
          {isOwnProfile ? (
            <div className="flex items-center gap-1">
              <Link
                to="/search"
                aria-label="Search"
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <SearchIcon className="w-5 h-5" />
              </Link>
              <NotificationBell currentUserId={user?.id} />
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          ) : user ? (
            <div className="flex items-center gap-1">
              <Link
                to="/search"
                aria-label="Search"
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <SearchIcon className="w-5 h-5" />
              </Link>
              <NotificationBell currentUserId={user.id} />
            </div>
          ) : (
            <span className="w-16" aria-hidden="true" />
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto pb-16">
        <CoverPhoto src={profile.cover_url} className="h-40 sm:h-56" />

        <div className="px-6">
          <div className="flex items-end justify-between -mt-12 sm:-mt-14">
            <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="xl" ringed />

            <div className="mb-1">
              {isOwnProfile ? (
                <Link
                  to="/settings/profile"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit profile
                </Link>
              ) : user ? (
                <div className="flex items-center gap-2 relative">
                  {!isBlocked && (
                    <>
                      <button
                        type="button"
                        onClick={handleMessage}
                        aria-label={`Message ${profile.display_name || profile.username}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-50 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Message
                      </button>
                      <FollowButton
                        currentUserId={user.id}
                        targetUserId={profile.id}
                        isFollowing={isFollowing}
                        onChange={(next) => {
                          setIsFollowing(next);
                          setCounts((c) => ({ ...c, followers: c.followers + (next ? 1 : -1) }));
                        }}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="More options"
                    className="p-2 rounded-full text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-100 shadow-lg py-1.5 z-20">
                      <button
                        type="button"
                        onClick={handleToggleBlock}
                        disabled={blocking}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        {isBlocked ? "Unblock user" : "Block user"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="font-display text-2xl font-semibold text-slate-900">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-slate-500">@{profile.username}</p>
          </div>

          {profile.bio && <p className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>}

          <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            Joined {formatJoinDate(profile.created_at)}
          </div>

          <SocialLinks links={profile.social_links} className="mt-4" />

          <div className="mt-5 flex items-center gap-5 text-sm">
            <button
              onClick={() => setModalTab("following")}
              className="hover:underline"
              disabled={counts.following === 0}
            >
              <span className="font-semibold text-slate-900">{counts.following}</span>{" "}
              <span className="text-slate-500">Following</span>
            </button>
            <button
              onClick={() => setModalTab("followers")}
              className="hover:underline"
              disabled={counts.followers === 0}
            >
              <span className="font-semibold text-slate-900">{counts.followers}</span>{" "}
              <span className="text-slate-500">Followers</span>
            </button>
          </div>
        </div>
      </main>

      {modalTab && <FollowListModal userId={profile.id} initialTab={modalTab} onClose={() => setModalTab(null)} />}
    </div>
  );
}
