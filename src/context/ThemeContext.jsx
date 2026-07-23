import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useProfile } from "./ProfileContext.jsx";
import { updateSettings } from "../lib/settings.js";

const ThemeContext = createContext(undefined);
const STORAGE_KEY = "voxly-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Wrap the app in this provider to get access to `useTheme()` anywhere.
 * Dark mode is applied instantly from localStorage (or system preference) so
 * there's no flash on load, then reconciled with the signed-in user's saved
 * `profiles.theme` once it loads, and any change is written back to both.
 */
export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [theme, setThemeState] = useState(getInitialTheme);
  const syncedProfileId = useRef(null);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Once the profile loads, adopt its saved theme (once per sign-in) so a
  // preference set on another device follows the user here.
  useEffect(() => {
    if (!profile || syncedProfileId.current === profile.id) return;
    syncedProfileId.current = profile.id;
    if (profile.theme && profile.theme !== theme) {
      setThemeState(profile.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const setTheme = useCallback(
    async (next) => {
      setThemeState(next);
      if (user) {
        const { data } = await updateSettings(user.id, { theme: next });
        if (data) setProfile((p) => (p ? { ...p, theme: data.theme } : p));
      }
    },
    [user, setProfile]
  );

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
