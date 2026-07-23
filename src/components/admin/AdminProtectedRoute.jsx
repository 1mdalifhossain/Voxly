import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useProfile } from "../../context/ProfileContext.jsx";
import LoadingScreen from "../auth/LoadingScreen.jsx";

/** Wrap /admin/* routes with this. Requires a session and profiles.is_admin = true. */
export default function AdminProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (loading || (isAuthenticated && profileLoading)) return <LoadingScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />;

  return children;
}
