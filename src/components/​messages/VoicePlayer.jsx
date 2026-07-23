import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Compact play/pause control with a progress bar, for a voice-note message bubble. */
export default function VoicePlayer({ src, duration = 0, tone = "light" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setElapsed(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const isDark = tone === "dark";

  return (
    <div className="flex items-center gap-2.5 min-w-[9rem]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isDark ? "bg-white/20 text-white hover:bg-white/30" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
        }`}
      >
        {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/25" : "bg-slate-200"}`}>
          <div
            className={`h-full rounded-full ${isDark ? "bg-white" : "bg-brand-500"}`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
      <span className={`text-xs tabular-nums shrink-0 ${isDark ? "text-white/80" : "text-slate-500"}`}>
        {formatTime(playing || elapsed > 0 ? elapsed : duration)}
      </span>
    </div>
  );
}
