import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import FormField from "../components/auth/FormField.jsx";
import AuthButton from "../components/auth/AuthButton.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isValidEmail, getPasswordStrength, friendlyAuthError } from "../lib/validation.js";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const strength = getPasswordStrength(form.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Enter your name.";
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!agreed) {
      setFormError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (!validate()) return;

    setLoading(true);
    const { data, error } = await signUp({
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
    });
    setLoading(false);

    if (error) {
      setFormError(friendlyAuthError(error));
      return;
    }

    // If confirmations are disabled in the Supabase project, a session
    // comes back immediately and the user is already signed in.
    if (data?.session) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/verify-email", { state: { email: form.email.trim() }, replace: true });
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Voxly and find your people."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </>
      }
    >
      <AlertBanner type="error">{formError}</AlertBanner>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          id="fullName"
          name="fullName"
          type="text"
          label="Full name"
          icon={User}
          placeholder="Jordan Rivera"
          autoComplete="name"
          value={form.fullName}
          onChange={handleChange}
          error={errors.fullName}
        />

        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />

        <div>
          <FormField
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          {form.password && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex gap-1">
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
          label="Confirm password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
          />
          <span>
            I agree to Voxly's{" "}
            <a href="#" className="font-medium text-brand-600 hover:text-brand-700">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="font-medium text-brand-600 hover:text-brand-700">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <AuthButton loading={loading}>Create account</AuthButton>
      </form>
    </AuthLayout>
  );
}
