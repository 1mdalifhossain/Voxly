import { useState } from "react";
import { Mail } from "lucide-react";
import SettingsHeader from "../../components/settings/SettingsHeader.jsx";
import SettingsSection from "../../components/settings/SettingsSection.jsx";
import SettingsRow from "../../components/settings/SettingsRow.jsx";
import FormField from "../../components/auth/FormField.jsx";
import AuthButton from "../../components/auth/AuthButton.jsx";
import AlertBanner from "../../components/auth/AlertBanner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getPasswordStrength, friendlyAuthError } from "../../lib/validation.js";

export default function Security() {
  const { user, updatePassword } = useAuth();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(form.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
    setSuccess(false);
  };

  const validate = () => {
    const next = {};
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    const { error } = await updatePassword(form.password);
    setLoading(false);

    if (error) {
      setFormError(friendlyAuthError(error));
      return;
    }
    setForm({ password: "", confirmPassword: "" });
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors">
      <SettingsHeader />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Security</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Manage your password and account access.</p>

        <SettingsSection title="Account">
          <SettingsRow icon={Mail} label="Email" description={user?.email} />
        </SettingsSection>

        <SettingsSection title="Change password">
          <div className="px-4 sm:px-5 py-5">
            <AlertBanner type="error">{formError}</AlertBanner>
            {success && <AlertBanner type="success">Your password has been updated.</AlertBanner>}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <FormField
                  id="password"
                  name="password"
                  type="password"
                  label="New password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                />
                {form.password && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Password strength: {strength.label}</p>
                  </div>
                )}
              </div>

              <FormField
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm new password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
              />

              <AuthButton loading={loading} className="w-auto px-6">
                Update password
              </AuthButton>
            </form>
          </div>
        </SettingsSection>
      </main>
    </div>
  );
}
