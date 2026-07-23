import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Loader2, Check } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import { formatRelativeTime } from "../../lib/format.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  hydrateNotification,
  describeNotification,
  notificationPreview,
} from "../../lib/notifications.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const TABS = [
  { key: "all", label: "All" },
  { key: "like", label: "Likes" },
  { key: "comment", label: "Comments" },
  { key: "follow", label: "Follows" },
  { key: "mention", label: "Mentions" },
];

const TYPE_ICON = {
  like: <Heart className="w-3.5 h-3.5 text-white" />,
  comment: <MessageCircle className="w-3.5 h-3.5 text-white" />,
  follow: <UserPlus className="w-3.5 h-3.5 text-white" />,
  mention: <AtSign className="w-3.5 h-3.5 text-white" />,
};

const TYPE_BG = {
  like: "bg-red-500",
  comment: "bg-brand-500",
  follow: "bg-emerald-500",
  mention: "bg-purple-500",
};

export default function NotificationBell({ currentUserId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const requestId = useRef(0);

  // Badge count — kept fresh even while the panel is closed.
  useEffect(() => {
    if (!currentUserId) return;
    getUnreadCount(currentUserId).then(({ count }) => setUnreadCount(count));
  }, [currentUserId]);

  // Load (or reload) the list whenever the panel is opened or the tab changes.
  useEffect(() => {
    if (!open || !currentUserId) return;
    const id = ++requestId.current;
    setLoading(true);
    const type = tab === "all" ? null : tab;
    getNotifications(currentUserId, { type }).then(({ data, nextCursor }) => {
      if (id !== requestId.current) return;
      setNotifications(data);
      setCursor(nextCursor);
      setHasMore(nextCursor != null);
      setLoading(false);
    });
  }, [open, tab, currentUserId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !currentUserId) return;
    setLoadingMore(true);
    const type = tab === "all" ? null : tab;
    const { data, nextCursor } = await getNotifications(currentUserId, { cursor, type });
    setNotifications((prev) => [...prev, ...data]);
    setCursor(nextCursor);
    setHasMore(nextCursor != null);
    setLoadingMore(false);
  }, [loadingMore, hasMore, currentUserId, cursor, tab]);

  // Real-time: new notifications land instantly; retracted ones (unlike,
  // unfollow) disappear; read-state changes from elsewhere stay in sync.
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToNotifications(currentUserId, {
      onInsert: async (row) => {
        setUnreadCount((c) => c + 1);
        const full = await hydrateNotification(row);
        setNotifications((prev) => {
          if (prev.some((n) => n.id === full.id)) return prev;
          if (tab !== "all" && full.type !== tab) return prev;
          return [full, ...prev];
        });
      },
      onUpdate: (row) => {
        setNotifications((prev) => prev.map((n) => (n.id === row.id ? { ...n, read: row.read } : n)));
      },
      onDelete: (row) => {
        setNotifications((prev) => prev.filter((n) => n.id !== row.id));
        if (!row.read) setUnreadCount((c) => Math.max(0, c - 1));
      },
    });
    return unsubscribe;
  }, [currentUserId, tab]);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead(currentUserId);
  };

  const handleItemClick = async (notification) => {
    setOpen(false);
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(notification.id, currentUserId);
    }
    if (notification.actor?.username) navigate(`/u/${notification.actor.username}`);
  };

  if (!currentUserId) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Notifications"
        className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[90vw] bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="font-display font-semibold text-slate-900 text-sm">Notifications</h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                    tab === t.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-[24rem] overflow-y-auto border-t border-slate-100">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10 px-6">
                  {tab === "all" ? "No notifications yet." : `No ${tab} notifications yet.`}
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-slate-50">
                    {notifications.map((n) => {
                      const preview = notificationPreview(n);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => handleItemClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                              n.read ? "" : "bg-brand-50/60"
                            }`}
                          >
                            <div className="relative shrink-0">
                              <Avatar
                                src={n.actor?.avatar_url}
                                name={n.actor?.display_name || n.actor?.username}
                                size="sm"
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white ${
                                  TYPE_BG[n.type] || "bg-slate-400"
                                }`}
                              >
                                {TYPE_ICON[n.type]}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-800 leading-snug">
                                <span className="font-semibold">{describeNotification(n).split(" ")[0]}</span>
                                {" " + describeNotification(n).split(" ").slice(1).join(" ")}
                              </p>
                              {preview && <p className="text-xs text-slate-500 truncate mt-0.5">"{preview}"</p>}
                              <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-600 mt-1.5 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {hasMore && (
                    <div className="flex justify-center py-3">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-60"
                      >
                        {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
