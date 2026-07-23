import { useState } from "react";
import { Check } from "lucide-react";
import SettingsHeader from "../../components/settings/SettingsHeader.jsx";
import SettingsSection from "../../components/settings/SettingsSection.jsx";
import SettingsRow from "../../components/settings/SettingsRow.jsx";
import ToggleSwitch from "../../components/settings/ToggleSwitch.jsx";
import AlertBanner from "../../components/auth/AlertBanner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useProfile } from "../../context/ProfileContext.jsx";
import { MESSAGE_PRIVACY_OPTIONS, updateSettings } from "../../lib/settings.js";

export default function Privacy() {
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [saving, setSaving] = useState(null); // which field is in flight
  const [error, setError] = useState("");

  const patch = async (updates) => {
    setError("");
    setSaving(Object.keys(updates)[0]);
    const { data, error } = await updateSettings(user.id, updates);
    setSaving(null);
    if (error) {
      setError(error.message);
      return;
    }
    setProfile((p) => (p ? { ...p, ...data } : p));
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors">
      <SettingsHeader />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Privacy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Control who can see and reach you on Voxly.</p>

        <AlertBanner type="error">{error}</AlertBanner>

        <SettingsSection title="Profile">
          <SettingsRow
            label="Private account"
            description="Only approved followers can see your posts and follower list"
            right={
              <ToggleSwitch
                checked={!!profile.is_private}
                onChange={(next) => patch({ is_private: next })}
                disabled={saving === "is_private"}
                label="Toggle private account"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Messages">
          <div className="px-4 sm:px-5 py-3.5 space-y-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Who can message you</p>
            <div className="space-y-2">
              {MESSAGE_PRIVACY_OPTIONS.map((option) => {
                const selected = (profile.message_privacy || "everyone") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => patch({ message_privacy: option.value })}
                    disabled={saving === "message_privacy"}
                    className={`w-full flex items-start gap-3 text-left rounded-xl border px-3.5 py-3 transition-colors disabled:opacity-60
                      ${selected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                  >
                    <span
                      className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center
                        ${selected ? "bg-brand-600 border-brand-600" : "border-slate-300 dark:border-slate-600"}`}
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{option.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </SettingsSection>
      </main>
    </div>
  );
}
