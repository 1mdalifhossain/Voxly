import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import FormField from "../components/auth/FormField.jsx";
import AuthButton from "../components/auth/AuthButton.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getPasswordStrength, friendlyAuthError } from "../lib/validation.js";
import { supabase } from "../lib/supabaseClient.js";

/**
 * Supabase sends the user here from the "reset password" email with a
 * recovery token in the URL. onAuthStateChange fires a PASSWORD_RECOVERY
 * event and establishes a temporary session, which lets us call
 * updateUser({ password }) directly.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(form.password);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // If the recovery session is already established (e.g. on remount),
    // the event above won't fire again — check directly as a fallback.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkInvalid(true);
        return r;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
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
    setSuccess(true);
    setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
  };

  if (linkInvalid) {
    return (
      <AuthLayout title="Link expired">
        <AlertBanner type="error">
          This password reset link is invalid or has expired. Please request a new one.
        </AlertBanner>
        <AuthButton type="button" onClick={() => navigate("/forgot-password")}>
          Request a new link
        </AuthButton>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password updated">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600">Your password has been reset. Taking you to your dashboard…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose something you haven't used before.">
      <AlertBanner type="error">{formError}</AlertBanner>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <FormField
            id="password"
            name="password"
            type="password"
            label="New password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={!ready}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          {form.password && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${strength.color}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Password strength: {strength.label}</p>
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
          disabled={!ready}
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <AuthButton loading={loading} disabled={!ready}>
          {ready ? "Update password" : "Verifying link…"}
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
