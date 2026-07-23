import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingScreen from "./LoadingScreen.jsx";

/**
 * Wrap login/signup/forgot-password with this so an already-signed-in
 * user gets redirected straight to their dashboard instead of seeing
 * the form again.
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
