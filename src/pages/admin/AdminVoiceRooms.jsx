import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users2, Square, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminBadge from "../../components/admin/AdminBadge.jsx";
import ConfirmActionModal from "../../components/admin/ConfirmActionModal.jsx";
import RoomTimer from "../../components/rooms/RoomTimer.jsx";
import Avatar from "../../components/profile/Avatar.jsx";
import { listRoomsAdmin, endRoomAsAdmin } from "../../lib/admin.js";

const STATUS_TABS = [
  { key: "live", label: "Live" },
  { key: "ended", label: "Ended" },
  { key: "all", label: "All" },
];

const PAGE_SIZE = 15;

export default function AdminVoiceRooms() {
  const [status, setStatus] = useState("live");
  const [page, setPage] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [endTarget, setEndTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await listRoomsAdmin({ status, page, pageSize: PAGE_SIZE });
    setRooms(data);
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
    <AdminLayout title="Voice Rooms" description={`${count} ${status === "all" ? "" : status} room${count === 1 ? "" : "s"}`}>
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
        ) : rooms.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">No rooms match.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 sm:px-5 py-4">
                <Avatar src={r.host?.avatar_url} name={r.host?.display_name || r.host?.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.title}</p>
                    <AdminBadge tone={r.status === "live" ? "green" : "slate"} dot={r.status === "live"}>
                      {r.status}
                    </AdminBadge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hosted by{" "}
                    <Link to={`/u/${r.host?.username}`} className="hover:underline">
                      {r.host?.display_name || r.host?.username}
                    </Link>
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Users2 className="w-3.5 h-3.5" />
                    {r.participant_count}
                  </span>
                  {r.status === "live" && <RoomTimer startedAt={r.started_at} className="text-xs" />}
                </div>

                {r.status === "live" && (
                  <button
                    onClick={() => setEndTarget(r)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-full px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors flex-shrink-0"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span className="hidden sm:inline">End room</span>
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

      {endTarget && (
        <ConfirmActionModal
          title="End this room?"
          description={`Everyone in "${endTarget.title}" will be sent back to the lobby right away.`}
          confirmLabel="End room"
          danger
          onClose={() => setEndTarget(null)}
          onConfirm={async () => {
            const result = await endRoomAsAdmin(endTarget.id);
            if (!result.error) load();
            return result;
          }}
        />
      )}
    </AdminLayout>
  );
}
