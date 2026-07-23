import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, Mic, Flag, UserPlus, Ban } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import StatCard from "../../components/admin/StatCard.jsx";
import TrendChart from "../../components/admin/TrendChart.jsx";
import { getDashboardStats, getSignupTrend, getPostTrend } from "../../lib/admin.js";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [signups, setSignups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [statsRes, signupRes, postRes] = await Promise.all([
        getDashboardStats(),
        getSignupTrend(14),
        getPostTrend(14),
      ]);
      if (cancelled) return;
      if (statsRes.error) setError(statsRes.error.message);
      setStats(statsRes.data);
      setSignups(signupRes.data);
      setPosts(postRes.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminLayout title="Dashboard" description="Overview of Voxly's activity and moderation queue">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 mb-6">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total users" value={stats?.total_users} icon={Users} tone="brand" />
        <StatCard label="New today" value={stats?.new_users_today} icon={UserPlus} tone="green" />
        <StatCard label="Banned users" value={stats?.banned_users} icon={Ban} tone="red" />
        <StatCard label="Total posts" value={stats?.total_posts} icon={FileText} tone="brand" />
        <StatCard label="Live rooms" value={stats?.live_rooms} icon={Mic} tone="green" />
        <StatCard label="Pending reports" value={stats?.pending_reports} icon={Flag} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Signups, last 14 days</h2>
          {!loading && <TrendChart data={signups} color="#2563EB" />}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Posts, last 14 days</h2>
          {!loading && <TrendChart data={posts} color="#10B981" />}
        </div>
      </div>

      {stats?.pending_reports > 0 && (
        <Link
          to="/admin/reports"
          className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-2xl px-5 py-4 text-sm hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300 font-medium">
            <Flag className="w-4 h-4" />
            {stats.pending_reports} report{stats.pending_reports === 1 ? "" : "s"} waiting for review
          </span>
          <span className="text-amber-700 dark:text-amber-400 font-medium">Review →</span>
        </Link>
      )}
    </AdminLayout>
  );
}
