import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Ban, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminBadge from "../../components/admin/AdminBadge.jsx";
import BanUserModal from "../../components/admin/BanUserModal.jsx";
import ConfirmActionModal from "../../components/admin/ConfirmActionModal.jsx";
import Avatar from "../../components/profile/Avatar.jsx";
import { listUsers, banUser, unbanUser } from "../../lib/admin.js";
import { formatRelativeTime } from "../../lib/format.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "admins", label: "Admins" },
  { key: "banned", label: "Banned" },
];

const PAGE_SIZE = 15;

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banTarget, setBanTarget] = useState(null);
  const [unbanTarget, setUnbanTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await listUsers({ search, filter, page, pageSize: PAGE_SIZE });
    setUsers(data);
    setCount(count);
    setLoading(false);
  }, [search, filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(0);
  };

  return (
    <AdminLayout title="Users" description={`${count} people on Voxly`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by username or name…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm py-2.5 pl-10 pr-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">No users match.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                <Link to={`/u/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {u.display_name || u.username}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{u.username}</p>
                  </div>
                </Link>

                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  {u.is_admin && <AdminBadge tone="brand">Admin</AdminBadge>}
                  {u.is_banned && <AdminBadge tone="red">Banned</AdminBadge>}
                  <span className="text-xs text-slate-400 dark:text-slate-500 w-20 text-right">
                    {formatRelativeTime(u.created_at)}
                  </span>
                </div>

                {u.is_banned ? (
                  <button
                    onClick={() => setUnbanTarget(u)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-3 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors flex-shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => setBanTarget(u)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-full px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors flex-shrink-0"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Ban
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:text-slate-900 dark:hover:text-white"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {banTarget && (
        <BanUserModal
          username={banTarget.username}
          onClose={() => setBanTarget(null)}
          onConfirm={async (reason) => {
            const result = await banUser(banTarget.id, reason);
            if (!result.error) load();
            return result;
          }}
        />
      )}

      {unbanTarget && (
        <ConfirmActionModal
          title={`Unban @${unbanTarget.username}?`}
          description="They'll immediately regain the ability to post, comment, and start rooms."
          confirmLabel="Unban user"
          onClose={() => setUnbanTarget(null)}
          onConfirm={async () => {
            const result = await unbanUser(unbanTarget.id);
            if (!result.error) load();
            return result;
          }}
        />
      )}
    </AdminLayout>
  );
}
