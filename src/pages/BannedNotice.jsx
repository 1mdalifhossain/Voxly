import { useNavigate } from "react-router-dom";
import { Ban, LogOut } from "lucide-react";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";

export default function BannedNotice() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-6 text-center font-body">
      <Logo className="w-10 h-10 mb-6" />
      <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-5">
        <Ban className="w-6 h-6" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Your account has been suspended
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-1">
        You can't post, comment, or start rooms while your account is suspended.
      </p>
      {profile?.ban_reason && (
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mt-3 mb-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3">
          Reason: {profile.ban_reason}
        </p>
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mb-8 mt-3">
        Think this was a mistake? Reach out to support to appeal.
      </p>
      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Log out
      </button>
    </div>
  );
}
