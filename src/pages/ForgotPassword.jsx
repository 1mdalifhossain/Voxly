import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import FormField from "../components/auth/FormField.jsx";
import AuthButton from "../components/auth/AuthButton.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isValidEmail, friendlyAuthError } from "../lib/validation.js";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldError("");

    if (!isValidEmail(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error } = await sendPasswordReset(email.trim());
    setLoading(false);

    if (error) {
      setError(friendlyAuthError(error));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        footer={
          <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-5">
            <MailCheck className="w-7 h-7 text-brand-600" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            If an account exists for <span className="font-medium text-slate-900">{email}</span>, we've sent a link to
            reset your password. The link expires shortly, so use it soon.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Didn't get it? Try again
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      }
    >
      <AlertBanner type="error">{error}</AlertBanner>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError("");
          }}
          error={fieldError}
        />

        <AuthButton loading={loading}>Send reset link</AuthButton>
      </form>
    </AuthLayout>
  );
}
