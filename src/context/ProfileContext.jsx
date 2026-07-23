import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getProfileById } from "../lib/profiles.js";

const ProfileContext = createContext(undefined);

/**
 * Wrap the authenticated part of the app in this provider to get access to
 * the current user's own `profiles` row anywhere via `useProfile()`.
 */
export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getProfileById(user.id);
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, setProfile }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
