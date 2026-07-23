import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import { ProfileProvider } from "./context/ProfileContext.jsx";
import { PresenceProvider } from "./context/PresenceContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute.jsx";
import LoadingScreen from "./components/auth/LoadingScreen.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Route-level code splitting: every page below is fetched on demand instead
// of being bundled into the initial payload. This is what keeps the landing
// page (`/`, imported eagerly via App.jsx) fast, since none of the
// auth/dashboard/room/admin code (including the heavy Agora SDK pulled in by
// Room.jsx) downloads until that route is actually visited.
const Login = lazy(() => import("./pages/Login.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Rooms = lazy(() => import("./pages/Rooms.jsx"));
const Room = lazy(() => import("./pages/Room.jsx"));
const Search = lazy(() => import("./pages/Search.jsx"));
const Messages = lazy(() => import("./pages/Messages.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const EditProfile = lazy(() => import("./pages/EditProfile.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Privacy = lazy(() => import("./pages/settings/Privacy.jsx"));
const Security = lazy(() => import("./pages/settings/Security.jsx"));
const BlockedUsers = lazy(() => import("./pages/settings/BlockedUsers.jsx"));
const BannedNotice = lazy(() => import("./pages/BannedNotice.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

import AdminProtectedRoute from "./components/admin/AdminProtectedRoute.jsx";
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts.jsx"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports.jsx"));
const AdminVoiceRooms = lazy(() => import("./pages/admin/AdminVoiceRooms.jsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <ThemeProvider>
          <PresenceProvider>
            <Suspense fallback={<LoadingScreen />}>
            <Routes>
            {/* Landing page — untouched, rendered exactly as designed */}
            <Route path="/" element={<App />} />

            {/* Auth routes — redirect away if already signed in */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <Signup />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />

            {/* Reset password / email links — not gated by PublicOnlyRoute
                since Supabase establishes a temporary session to land here */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected routes — require an active session */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms"
              element={
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms/:roomId"
              element={
                <ProtectedRoute>
                  <Room />
                </ProtectedRoute>
              }
            />
            <Route
              path="/u/:username"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/profile"
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/privacy"
              element={
                <ProtectedRoute>
                  <Privacy />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/security"
              element={
                <ProtectedRoute>
                  <Security />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/blocked-users"
              element={
                <ProtectedRoute>
                  <BlockedUsers />
                </ProtectedRoute>
              }
            />

              <Route
                path="/banned"
                element={
                  <ProtectedRoute>
                    <BannedNotice />
                  </ProtectedRoute>
                }
              />

              {/* Admin panel — requires an active session AND profiles.is_admin = true */}
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminProtectedRoute>
                    <AdminUsers />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/posts"
                element={
                  <AdminProtectedRoute>
                    <AdminPosts />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminProtectedRoute>
                    <AdminReports />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/rooms"
                element={
                  <AdminProtectedRoute>
                    <AdminVoiceRooms />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminProtectedRoute>
                    <AdminAnalytics />
                  </AdminProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </PresenceProvider>
          </ThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
