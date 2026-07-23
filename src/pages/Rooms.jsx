import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mic, Newspaper } from "lucide-react";
import Logo from "../components/Logo.jsx";
import Avatar from "../components/profile/Avatar.jsx";
import NotificationBell from "../components/notifications/NotificationBell.jsx";
import RoomCard from "../components/rooms/RoomCard.jsx";
import CreateRoomModal from "../components/rooms/CreateRoomModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { listLiveRooms, getParticipantCounts, subscribeToRoomsList, getRoom } from "../lib/rooms.js";

export default function Rooms() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listLiveRooms().then(async ({ data }) => {
      if (!active) return;
      setRooms(data);
      setLoading(false);
      const { data: countData } = await getParticipantCounts(data.map((r) => r.id));
      if (active) setCounts(countData);
    });
    return () => {
      active = false;
    };
  }, []);

  // Live: a new room goes up, or a room ends and should drop out of the grid.
  useEffect(() => {
    const unsubscribe = subscribeToRoomsList({
      onInsert: async (row) => {
        const { data: hydrated } = await getRoom(row.id);
        if (hydrated) setRooms((prev) => [hydrated, ...prev]);
      },
      onUpdate: (row) => {
        if (row.status === "ended") {
          setRooms((prev) => prev.filter((r) => r.id !== row.id));
        }
      },
    });
    return unsubscribe;
  }, []);

  const handleCreated = (room) => {
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-lg text-slate-900">Voxly</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              aria-label="Feed"
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Newspaper className="w-5 h-5" />
            </Link>
            <NotificationBell currentUserId={user?.id} />
            {profile && (
              <Link to={`/u/${profile.username}`} className="hidden sm:block">
                <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="sm" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-semibold text-2xl text-slate-900">Voice Rooms</h1>
            <p className="text-sm text-slate-500 mt-0.5">Drop into a live conversation, or start your own.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-full px-5 py-2.5 transition-colors shadow-sm shadow-brand-200 shrink-0"
          >
            <Mic className="w-4 h-4" />
            Start a room
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <p className="text-slate-500 text-sm">No rooms are live right now. Be the first to start one!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} participantCount={counts[room.id] ?? 0} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateRoomModal hostId={user?.id} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
