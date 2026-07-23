import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import LiveIndicator from "./LiveIndicator.jsx";
import RoomTimer from "./RoomTimer.jsx";

/** A single live room in the browse/lobby grid. */
export default function RoomCard({ room, participantCount }) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="block bg-white rounded-2xl border border-slate-100 p-5 hover:border-brand-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <LiveIndicator size="sm" />
        <RoomTimer startedAt={room.started_at} className="text-xs" />
      </div>

      <h3 className="font-display font-semibold text-slate-900 leading-snug mb-1 line-clamp-2">{room.title}</h3>
      {room.description && <p className="text-sm text-slate-500 line-clamp-2 mb-4">{room.description}</p>}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={room.host?.avatar_url}
            name={room.host?.display_name || room.host?.username}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none mb-0.5">Hosted by</p>
            <p className="text-sm font-medium text-slate-800 truncate">
              {room.host?.display_name || room.host?.username}
            </p>
          </div>
        </div>

        {typeof participantCount === "number" && (
          <div className="flex items-center gap-1 text-sm text-slate-500 shrink-0">
            <Users className="w-4 h-4" />
            {participantCount}
          </div>
        )}
      </div>
    </Link>
  );
}
