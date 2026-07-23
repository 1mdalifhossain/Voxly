import { useState } from "react";
import { MicOff, Hand, Crown, MoreVertical, ArrowUpCircle, ArrowDownCircle, VolumeX, UserX } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const ROLE_LABEL = { host: "Host", speaker: "Speaker", listener: "Listener" };

/**
 * One tile in the room's participant grid. Shows a glowing ring while the
 * person is actively speaking, a raised-hand badge, a mute indicator, and —
 * for the host looking at anyone but themselves — a small menu of controls.
 */
export default function ParticipantTile({ participant, isSpeaking, isHostView, onAction }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeKey(() => setMenuOpen(false), menuOpen);
  const profile = participant.profile;
  const name = profile?.display_name || profile?.username || "Someone";
  const canModerate = isHostView && participant.role !== "host";

  return (
    <div className="relative flex flex-col items-center gap-2 text-center">
      <div className="relative">
        <div
          className={`rounded-full transition-shadow ${
            isSpeaking ? "ring-4 ring-emerald-400 shadow-lg shadow-emerald-100" : "ring-2 ring-transparent"
          }`}
        >
          <Avatar src={profile?.avatar_url} name={name} size="lg" />
        </div>

        {participant.role !== "listener" && participant.muted && (
          <span className="absolute -bottom-1 -right-1 bg-slate-700 text-white rounded-full p-1 shadow-sm">
            <MicOff className="w-3 h-3" />
          </span>
        )}

        {participant.hand_raised && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-1 shadow-sm animate-bounce">
            <Hand className="w-3 h-3" />
          </span>
        )}

        {participant.role === "host" && (
          <span className="absolute -top-1 -left-1 bg-brand-600 text-white rounded-full p-1 shadow-sm">
            <Crown className="w-3 h-3" />
          </span>
        )}

        {canModerate && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Manage ${name}`}
            className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 bg-white text-slate-500 rounded-full p-1 shadow-sm border border-slate-100 hover:text-slate-800"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div className="absolute z-40 top-full mt-1 left-1/2 -translate-x-1/2 w-44 bg-white rounded-xl border border-slate-100 shadow-lg py-1 text-left">
              {participant.role === "listener" ? (
                <MenuItem
                  icon={<ArrowUpCircle className="w-3.5 h-3.5" />}
                  label="Make speaker"
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("promote", participant);
                  }}
                />
              ) : (
                <>
                  <MenuItem
                    icon={<ArrowDownCircle className="w-3.5 h-3.5" />}
                    label="Move to listener"
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("demote", participant);
                    }}
                  />
                  {!participant.muted && (
                    <MenuItem
                      icon={<VolumeX className="w-3.5 h-3.5" />}
                      label="Mute"
                      onClick={() => {
                        setMenuOpen(false);
                        onAction("mute", participant);
                      }}
                    />
                  )}
                </>
              )}
              <MenuItem
                icon={<UserX className="w-3.5 h-3.5" />}
                label="Remove from room"
                danger
                onClick={() => {
                  setMenuOpen(false);
                  onAction("remove", participant);
                }}
              />
            </div>
          </>
        )}
      </div>

      <div className="min-w-0 max-w-[6.5rem]">
        <p className="text-xs font-medium text-slate-800 truncate">{name}</p>
        <p className="text-[11px] text-slate-400">{ROLE_LABEL[participant.role]}</p>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
