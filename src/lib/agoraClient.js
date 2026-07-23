import AgoraRTC from "agora-rtc-sdk-ng";

// Set in a .env file at the project root (see .env.example):
//   VITE_AGORA_APP_ID=your-agora-app-id
export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

// Optional. If you deploy a token server (recommended for anything beyond
// local testing — see README "Voice Rooms / Agora setup"), point this at it
// and rooms will fetch a fresh RTC token before every join. Left unset, rooms
// join with a null token, which only works while your Agora project's
// "App ID only" authentication mode is enabled in the Agora Console — fine
// for development, not for production.
const TOKEN_ENDPOINT = import.meta.env.VITE_AGORA_TOKEN_ENDPOINT;

AgoraRTC.setLogLevel(3); // warnings + errors only

/** Fetch (or skip) an RTC token for joining `channel` as `uid`. */
export async function fetchAgoraToken(channel, uid) {
  if (!TOKEN_ENDPOINT) return null;
  const url = `${TOKEN_ENDPOINT}?channel=${encodeURIComponent(channel)}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch a voice room token. Please try again.");
  const { token } = await res.json();
  return token;
}

export { AgoraRTC };
