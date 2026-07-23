import { useEffect, useState } from "react";
import { Loader2, UserX } from "lucide-react";
import SettingsHeader from "../../components/settings/SettingsHeader.jsx";
import SettingsSection from "../../components/settings/SettingsSection.jsx";
import BlockedUserRow from "../../components/settings/BlockedUserRow.jsx";
import AlertBanner from "../../components/auth/AlertBanner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listBlockedUsers, unblockUser } from "../../lib/settings.js";

export default function BlockedUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listBlockedUsers(user.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError(error.message);
      setUsers(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const handleUnblock = async (blockedId) => {
    setError("");
    setUnblockingId(blockedId);
    const { error } = await unblockUser(user.id, blockedId);
    setUnblockingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== blockedId));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors">
      <SettingsHeader />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Blocked users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Blocked accounts can't view your profile, message you, or show up in your search results.
        </p>

        <AlertBanner type="error">{error}</AlertBanner>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <UserX className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">You haven't blocked anyone.</p>
          </div>
        ) : (
          <SettingsSection>
            {users.map((u) => (
              <BlockedUserRow key={u.id} user={u} onUnblock={handleUnblock} unblocking={unblockingId === u.id} />
            ))}
          </SettingsSection>
        )}
      </main>
    </div>
  );
}
