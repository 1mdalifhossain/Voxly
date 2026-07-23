import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Loader2 } from "lucide-react";

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return "";
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A mic button that, when pressed, expands in place into a recording bar
 * (elapsed time + cancel + send) using the browser's MediaRecorder API.
 * Calls `onSend(blob, durationSeconds, mimeType)` when the user confirms.
 */
export default function VoiceRecorder({ onSend, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [preparing, setPreparing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef("");
  const shouldSendRef = useRef(true);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const startRecording = async () => {
    setError(null);
    setPreparing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      shouldSendRef.current = true;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        cleanupStream();
        if (shouldSendRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || "audio/webm" });
          onSend?.(blob, seconds, mimeTypeRef.current || "audio/webm");
        }
        chunksRef.current = [];
        setRecording(false);
        setSeconds(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setPreparing(false);

      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 200);
    } catch {
      setPreparing(false);
      setError("Microphone access denied.");
    }
  };

  const stopAndSend = () => {
    shouldSendRef.current = true;
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    shouldSendRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  if (error) {
    return <p className="text-xs text-red-600 px-2">{error}</p>;
  }

  if (!recording) {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled || preparing}
        aria-label="Record a voice message"
        className="p-2.5 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
      >
        {preparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 rounded-full pl-3 pr-1.5 py-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
      <span className="text-sm font-medium text-red-700 tabular-nums w-10">{formatDuration(seconds)}</span>
      <button
        type="button"
        onClick={cancelRecording}
        aria-label="Cancel recording"
        className="p-2 rounded-full text-slate-500 hover:text-red-600 hover:bg-white transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={stopAndSend}
        aria-label="Send voice message"
        className="p-2 rounded-full text-white bg-red-500 hover:bg-red-600 transition-colors"
      >
        <Square className="w-4 h-4" fill="currentColor" />
      </button>
    </div>
  );
}
