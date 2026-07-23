import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import ConfirmActionModal from "../../components/admin/ConfirmActionModal.jsx";
import Avatar from "../../components/profile/Avatar.jsx";
import { listPostsAdmin, deletePostAsAdmin } from "../../lib/admin.js";
import { formatRelativeTime } from "../../lib/format.js";

const PAGE_SIZE = 15;

export default function AdminPosts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [posts, setPosts] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await listPostsAdmin({ search, page, pageSize: PAGE_SIZE });
    setPosts(data);
    setCount(count);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <AdminLayout title="Posts" description={`${count} posts on Voxly`}>
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search post content…"
          className="w-full sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm py-2.5 pl-10 pr-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">No posts match.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {posts.map((p) => (
              <div key={p.id} className="flex items-start gap-3 px-4 sm:px-5 py-4">
                <Avatar src={p.author?.avatar_url} name={p.author?.display_name || p.author?.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link
                      to={`/u/${p.author?.username}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      {p.author?.display_name || p.author?.username}
                    </Link>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(p.created_at)}
                    </span>
                    {p.image_url && <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 break-words">
                    {p.content || <span className="italic text-slate-400">(image only)</span>}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-full px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
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

      {deleteTarget && (
        <ConfirmActionModal
          title="Delete this post?"
          description="This removes it for everyone immediately. This can't be undone."
          confirmLabel="Delete post"
          danger
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const result = await deletePostAsAdmin(deleteTarget.id);
            if (!result.error) load();
            return result;
          }}
        />
      )}
    </AdminLayout>
  );
}
