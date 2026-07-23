import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Globe, Lock, ShieldCheck, UserX, Trash2, LogOut, UserCircle2, Loader2, LayoutDashboard } from "lucide-react";
import SettingsHeader from "../components/settings/SettingsHeader.jsx";
import SettingsSection from "../components/settings/SettingsSection.jsx";
import SettingsRow from "../components/settings/SettingsRow.jsx";
import ToggleSwitch from "../components/settings/ToggleSwitch.jsx";
import DeleteAccountModal from "../components/settings/DeleteAccountModal.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { LANGUAGES, updateSettings, requestAccountDeletion } from "../lib/settings.js";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, setProfile } = useProfile();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [savingLanguage, setSavingLanguage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLanguageChange = async (e) => {
    const language = e.target.value;
    setError("");
    setSavingLanguage(true);
    const { data, error } = await updateSettings(user.id, { language });
    setSavingLanguage(false);
    if (error) {
      setError(error.message);
      return;
    }
    setProfile((p) => (p ? { ...p, language: data.language } : p));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleDeleteAccount = async () => {
    const { error } = await requestAccountDeletion();
    if (error) return { error };
    await signOut();
    navigate("/login", { replace: true });
    return { error: null };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors">
      <SettingsHeader backTo="/dashboard" backLabel="Back to feed" />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Manage how Voxly looks and works for you.</p>

        <AlertBanner type="error">{error}</AlertBanner>

        <SettingsSection title="Account">
          <SettingsRow
            icon={UserCircle2}
            label="Edit profile"
            description="Photo, bio, username, and social links"
            to="/settings/profile"
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow
            icon={Moon}
            label="Dark mode"
            description={isDark ? "On" : "Off"}
            right={<ToggleSwitch checked={isDark} onChange={toggleTheme} label="Toggle dark mode" />}
          />
          <SettingsRow
            icon={Globe}
            label="Language"
            description="Used for emails and app text"
            right={
              <div className="flex items-center gap-2">
                {savingLanguage && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                <select
                  value={profile?.language || "en"}
                  onChange={handleLanguageChange}
                  disabled={savingLanguage}
                  className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg py-1.5 pl-2.5 pr-7 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="text-slate-900">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
        </SettingsSection>

        <SettingsSection title="Privacy & safety">
          <SettingsRow
            icon={Lock}
            label="Privacy"
            description="Who can see your profile and message you"
            to="/settings/privacy"
          />
          <SettingsRow icon={ShieldCheck} label="Security" description="Password and account access" to="/settings/security" />
          <SettingsRow icon={UserX} label="Blocked users" description="People you've blocked" to="/settings/blocked-users" />
        </SettingsSection>

        {profile?.is_admin && (
          <SettingsSection title="Administration">
            <SettingsRow icon={LayoutDashboard} label="Admin panel" description="Users, posts, reports, and analytics" to="/admin" />
          </SettingsSection>
        )}

        <SettingsSection title="Danger zone">
          <SettingsRow icon={Trash2} label="Delete account" danger onClick={() => setShowDeleteModal(true)} />
        </SettingsSection>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-60 px-1"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </main>

      {showDeleteModal && (
        <DeleteAccountModal onConfirm={handleDeleteAccount} onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
