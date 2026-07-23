import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminBadge from "../../components/admin/AdminBadge.jsx";
import ConfirmActionModal from "../../components/admin/ConfirmActionModal.jsx";
import Avatar from "../../components/profile/Avatar.jsx";
import { useProfile } from "../../context/ProfileContext.jsx";
import { listReports, resolveReport, dismissReport } from "../../lib/admin.js";
import { formatRelativeTime } from "../../lib/format.js";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

const STATUS_TONE = { pending: "amber", resolved: "green", dismissed: "slate" };

const TARGET_LINKS = {
  user: (label) => (label ? `/u/${label}` : null),
};

const PAGE_SIZE = 15;

export default function AdminReports() {
  const { profile } = useProfile();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [reports, setReports] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null); // { report, action: "resolve" | "dismiss" }

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await listReports({ status, page, pageSize: PAGE_SIZE });
    setReports(data);
    setCount(count);
    setLoading(false);
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const handleTabChange = (key) => {
    setStatus(key);
    setPage(0);
  };

  return (
    <AdminLayout title="Reports" description={`${count} ${status === "all" ? "" : status} report${count === 1 ? "" : "s"}`}>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === t.key
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">Nothing here.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports.map((r) => {
              const link = TARGET_LINKS[r.target_type]?.(r.target_label);
              return (
                <div key={r.id} className="flex items-start gap-3 px-4 sm:px-5 py-4">
                  <Avatar
                    src={r.reporter?.avatar_url}
                    name={r.reporter?.display_name || r.reporter?.username}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm text-slate-900 dark:text-slate-100">
                        <span className="font-medium">{r.reporter?.display_name || r.reporter?.username}</span>{" "}
                        reported a <AdminBadge tone="slate">{r.target_type}</AdminBadge>
                      </span>
                      <AdminBadge tone={STATUS_TONE[r.status]}>{r.status}</AdminBadge>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.reason}</p>
                    {r.target_label && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Target:{" "}
                        {link ? (
                          <Link to={link} className="hover:underline">
                            {r.target_label}
                          </Link>
                        ) : (
                          r.target_label
                        )}
                      </p>
                    )}
                    {r.details && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.details}</p>}
                  </div>

                  {r.status === "pending" && (
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <button
                        onClick={() => setActionTarget({ report: r, action: "resolve" })}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-3 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                      <button
                        onClick={() => setActionTarget({ report: r, action: "dismiss" })}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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

      {actionTarget && (
        <ConfirmActionModal
          title={actionTarget.action === "resolve" ? "Mark this report resolved?" : "Dismiss this report?"}
          description={
            actionTarget.action === "resolve"
              ? "Use this once you've taken action on the reported content or user."
              : "Use this if the report doesn't need action. It stays on record either way."
          }
          confirmLabel={actionTarget.action === "resolve" ? "Mark resolved" : "Dismiss"}
          danger={actionTarget.action === "dismiss"}
          onClose={() => setActionTarget(null)}
          onConfirm={async () => {
            const fn = actionTarget.action === "resolve" ? resolveReport : dismissReport;
            const result = await fn(actionTarget.report.id, profile?.id);
            if (!result.error) load();
            return result;
          }}
        />
      )}
    </AdminLayout>
  );
}
