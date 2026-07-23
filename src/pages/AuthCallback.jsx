import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import AuthButton from "../components/auth/AuthButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";

/**
 * Landing point for Supabase's `emailRedirectTo` link (signup confirmation
 * and resent verification emails). Supabase's client library parses the
 * token from the URL automatically on load; we just wait for the resulting
 * session and route the user onward.
 */
export default function AuthCallback() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | success | error

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      setStatus("success");
      return;
    }

    // Give Supabase a moment to parse the URL hash/query on first load.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setStatus(data.session ? "success" : "error");
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, isAuthenticated]);

  if (status === "verifying") {
    return (
      <AuthLayout title="Verifying your email…">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-500">Just a moment while we confirm your account.</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout title="Verification failed">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <XCircle className="w-7 h-7 text-red-600" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            This verification link is invalid or has expired. Please try logging in, or request a new link.
          </p>
          <AuthButton type="button" onClick={() => navigate("/login")}>
            Back to login
          </AuthButton>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Email verified">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Your email has been verified and you're signed in. Welcome to Voxly!
        </p>
        <AuthButton type="button" onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </AuthButton>
      </div>
    </AuthLayout>
  );
}
