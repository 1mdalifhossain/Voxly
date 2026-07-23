import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Ticking "how long has this room been live" display, driven off `startedAt`. */
export default function RoomTimer({ startedAt, className = "" }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!startedAt) return null;
  const elapsed = now - new Date(startedAt).getTime();

  return (
    <span className={`inline-flex items-center gap-1.5 text-slate-500 tabular-nums ${className}`}>
      <Clock className="w-3.5 h-3.5" />
      {formatElapsed(elapsed)}
    </span>
  );
}
