import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import FormField from "../components/auth/FormField.jsx";
import AuthButton from "../components/auth/AuthButton.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isValidEmail, friendlyAuthError } from "../lib/validation.js";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setUnverifiedEmail(null);
    if (!validate()) return;

    setLoading(true);
    const { error } = await signIn({ email: form.email.trim(), password: form.password });
    setLoading(false);

    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        setUnverifiedEmail(form.email.trim());
      }
      setFormError(friendlyAuthError(error));
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to keep the conversation going."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
            Sign up
          </Link>
        </>
      }
    >
      <AlertBanner type="error">{formError}</AlertBanner>

      {unverifiedEmail && (
        <div className="mb-5 text-sm text-slate-500">
          Need a new verification link?{" "}
          <Link
            to="/verify-email"
            state={{ email: unverifiedEmail }}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Resend it
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
          <FormField
            id="password"
            name="password"
            type="password"
            label="Password"
            hideLabel
            placeholder="••••••••"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
        </div>

        <AuthButton loading={loading}>Log in</AuthButton>
      </form>
    </AuthLayout>
  );
}
