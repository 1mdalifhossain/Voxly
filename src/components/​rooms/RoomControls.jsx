import { Mic, MicOff, Hand, PhoneOff, Loader2 } from "lucide-react";

/**
 * Bottom control bar for a voice room. Shows mute/unmute for the host and
 * speakers, raise/lower hand for listeners, and leave (or end, for the host).
 */
export default function RoomControls({ role, muted, handRaised, ending, onToggleMute, onToggleHand, onLeaveOrEnd }) {
  const isHost = role === "host";
  const canSpeak = role === "host" || role === "speaker";

  return (
    <div className="flex items-center justify-center gap-3 bg-white border-t border-slate-100 px-4 py-4">
      {canSpeak && (
        <button
          onClick={onToggleMute}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          className={`flex flex-col items-center gap-1 w-16 py-2 rounded-2xl text-xs font-medium transition-colors ${
            muted ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {muted ? "Unmute" : "Mute"}
        </button>
      )}

      {role === "listener" && (
        <button
          onClick={onToggleHand}
          aria-label={handRaised ? "Lower hand" : "Raise hand"}
          className={`flex flex-col items-center gap-1 w-16 py-2 rounded-2xl text-xs font-medium transition-colors ${
            handRaised ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Hand className="w-5 h-5" />
          {handRaised ? "Lower" : "Raise"}
        </button>
      )}

      <button
        onClick={onLeaveOrEnd}
        disabled={ending}
        aria-label={isHost ? "End room" : "Leave room"}
        className="flex flex-col items-center gap-1 w-16 py-2 rounded-2xl text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {ending ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneOff className="w-5 h-5" />}
        {isHost ? "End" : "Leave"}
      </button>
    </div>
  );
}
