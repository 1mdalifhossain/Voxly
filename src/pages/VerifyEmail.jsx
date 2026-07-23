import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import AuthButton from "../components/auth/AuthButton.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { friendlyAuthError } from "../lib/validation.js";

export default function VerifyEmail() {
  const { resendVerificationEmail, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || user?.email || "";

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (!email) {
      navigate("/signup");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    const { error } = await resendVerificationEmail(email);
    setLoading(false);

    if (error) {
      setError(friendlyAuthError(error));
      return;
    }
    setMessage("Verification email sent. Check your inbox (and spam folder).");

    setCooldown(30);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <AuthLayout
      title="Verify your email"
      footer={
        <>
          Wrong email?{" "}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
            Sign up again
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-5">
          <MailCheck className="w-7 h-7 text-brand-600" />
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-1">
          We've sent a verification link to
        </p>
        <p className="text-sm font-semibold text-slate-900 mb-5">{email || "your email address"}</p>
        <p className="text-sm text-slate-500 leading-relaxed">
          Click the link in that email to activate your account. Once verified, you can log in and start exploring
          Voxly.
        </p>

        <div className="w-full mt-6">
          <AlertBanner type="error">{error}</AlertBanner>
          <AlertBanner type="success">{message}</AlertBanner>

          <AuthButton onClick={handleResend} loading={loading} disabled={cooldown > 0} type="button">
            {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
          </AuthButton>
        </div>

        <Link to="/login" className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
