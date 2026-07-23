import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";

const PresenceContext = createContext(undefined);

/**
 * Wrap the authenticated part of the app in this provider to know who's
 * online right now. Presence is tracked on a single shared realtime channel
 * (`presence:online`) keyed by user id — nothing is written to the database,
 * it only exists for as long as a tab is connected.
 */
export function PresenceProvider({ children }) {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState(() => new Set());

  useEffect(() => {
    if (!user) {
      setOnlineIds(new Set());
      return;
    }

    const channel = supabase.channel("presence:online", {
      config: { presence: { key: user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isOnline = useCallback((userId) => onlineIds.has(userId), [onlineIds]);

  return <PresenceContext.Provider value={{ onlineIds, isOnline }}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (ctx === undefined) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return ctx;
}
