import { useEffect, useRef, useState } from "react";
import { AgoraRTC, AGORA_APP_ID, fetchAgoraToken } from "../lib/agoraClient.js";

/**
 * Manages the live Agora RTC connection for a single voice room: joining and
 * leaving the channel, publishing the local mic while `canPublish` is true
 * (host/speaker) and un-publishing it the moment a host demotes you back to
 * listener, subscribing to every other speaker's audio, and reporting who's
 * currently making sound so the UI can draw a speaking-glow ring.
 *
 * Toggle `muted` to mute/unmute without leaving the channel or dropping the
 * publish — it just enables/disables the local track.
 */
export function useAgoraRoom({ roomId, uid, canPublish, muted }) {
  const clientRef = useRef(null);
  const localTrackRef = useRef(null);
  const [joined, setJoined] = useState(false);
  const [speakingUids, setSpeakingUids] = useState(() => new Set());
  const [connectionError, setConnectionError] = useState(null);

  // Join the channel once per room/uid, and tear everything down on leave.
  useEffect(() => {
    if (!roomId || !uid) return;
    if (!AGORA_APP_ID) {
      setConnectionError("Voice Rooms isn't configured yet — missing VITE_AGORA_APP_ID.");
      return;
    }

    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;
    client.enableAudioVolumeIndicator();

    const handleVolumeIndicator = (volumes) => {
      const speaking = new Set(volumes.filter((v) => v.level > 5).map((v) => String(v.uid)));
      setSpeakingUids(speaking);
    };
    const handleUserPublished = async (user, mediaType) => {
      if (mediaType !== "audio") return;
      try {
        await client.subscribe(user, mediaType);
        user.audioTrack?.play();
      } catch {
        // Remote user may have unpublished again before the subscribe resolved — ignore.
      }
    };

    client.on("volume-indicator", handleVolumeIndicator);
    client.on("user-published", handleUserPublished);

    (async () => {
      try {
        const token = await fetchAgoraToken(roomId, uid);
        await client.join(AGORA_APP_ID, roomId, token, uid);
        if (!cancelled) setJoined(true);
      } catch (err) {
        if (!cancelled) setConnectionError(err?.message || "Couldn't connect to the voice room.");
      }
    })();

    return () => {
      cancelled = true;
      client.off("volume-indicator", handleVolumeIndicator);
      client.off("user-published", handleUserPublished);
      if (localTrackRef.current) {
        localTrackRef.current.close();
        localTrackRef.current = null;
      }
      client.leave().catch(() => {});
      setJoined(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, uid]);

  // Publish, unpublish, or enable/disable the mic as role/mute state changes.
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !joined) return;
    let cancelled = false;

    (async () => {
      if (!canPublish) {
        if (localTrackRef.current) {
          const track = localTrackRef.current;
          localTrackRef.current = null;
          await client.unpublish([track]).catch(() => {});
          track.close();
        }
        return;
      }

      if (!localTrackRef.current) {
        try {
          const track = await AgoraRTC.createMicrophoneAudioTrack();
          if (cancelled) {
            track.close();
            return;
          }
          await track.setEnabled(!muted);
          localTrackRef.current = track;
          await client.publish([track]);
        } catch (err) {
          if (!cancelled) setConnectionError(err?.message || "Couldn't access your microphone.");
        }
      } else {
        await localTrackRef.current.setEnabled(!muted);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canPublish, muted, joined]);

  return { joined, speakingUids, connectionError };
}
