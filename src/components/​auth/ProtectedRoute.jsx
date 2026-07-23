import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useProfile } from "../../context/ProfileContext.jsx";
import LoadingScreen from "./LoadingScreen.jsx";

/**
 * Wrap any route element with this to require an active session.
 * Unauthenticated users are bounced to /login, and are sent back
 * to the page they wanted once they sign in. Banned users are sent
 * to /banned instead of whatever page they wanted.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (loading || (isAuthenticated && profileLoading)) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.is_banned && location.pathname !== "/banned") {
    return <Navigate to="/banned" replace />;
  }

  return children;
}
