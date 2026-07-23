import { useEffect, useState, useCallback } from "react";
import { TrendingUp } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import TrendChart from "../../components/admin/TrendChart.jsx";
import { getSignupTrend, getPostTrend, getDashboardStats } from "../../lib/admin.js";

const RANGES = [
  { key: 7, label: "7 days" },
  { key: 14, label: "14 days" },
  { key: 30, label: "30 days" },
];

function sum(data) {
  return data.reduce((total, d) => total + d.count, 0);
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(14);
  const [signups, setSignups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [signupRes, postRes, statsRes] = await Promise.all([
      getSignupTrend(days),
      getPostTrend(days),
      getDashboardStats(),
    ]);
    setSignups(signupRes.data);
    setPosts(postRes.data);
    setStats(statsRes.data);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout
      title="Analytics"
      description="Growth and engagement trends"
      actions={
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDays(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === r.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">New signups</p>
          <p className="text-2xl font-display font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {loading ? "—" : sum(signups)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">New posts</p>
          <p className="text-2xl font-display font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {loading ? "—" : sum(posts)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total users to date</p>
          <p className="text-2xl font-display font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {stats?.total_users ?? "—"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          Signups, last {days} days
        </h2>
        {!loading && <TrendChart data={signups} color="#2563EB" height={200} />}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Posts created, last {days} days
        </h2>
        {!loading && <TrendChart data={posts} color="#10B981" height={200} />}
      </div>
    </AdminLayout>
  );
}
