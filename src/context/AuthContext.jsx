import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient.js";

const AuthContext = createContext(undefined);

/**
 * Wrap the app in this provider to get access to `useAuth()` anywhere.
 * Handles:
 *  - Loading the current session on mount
 *  - Keeping session/user in sync via onAuthStateChange (login, logout,
 *    token refresh, email verification, password recovery, etc.)
 *  - Exposing the core auth actions used across the auth pages
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  }, []);

  const resendVerificationEmail = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { data, error };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      isAuthenticated: !!session,
      isEmailVerified: !!user?.email_confirmed_at,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      resendVerificationEmail,
    }),
    [session, user, loading, signUp, signIn, signOut, sendPasswordReset, updatePassword, resendVerificationEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
