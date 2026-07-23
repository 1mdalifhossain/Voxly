import ParticipantTile from "./ParticipantTile.jsx";

/** Full participant grid for a room: host + speakers up top, listeners below. */
export default function ParticipantsList({ participants, speakingUids, isHostView, onAction }) {
  const onStage = participants.filter((p) => p.role === "host" || p.role === "speaker");
  const listeners = participants.filter((p) => p.role === "listener");

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
          Host &amp; Speakers ({onStage.length})
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-6">
          {onStage.map((p) => (
            <ParticipantTile
              key={p.id}
              participant={p}
              isSpeaking={speakingUids.has(String(p.user_id))}
              isHostView={isHostView}
              onAction={onAction}
            />
          ))}
        </div>
      </section>

      {listeners.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Listening ({listeners.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-6">
            {listeners.map((p) => (
              <ParticipantTile
                key={p.id}
                participant={p}
                isSpeaking={false}
                isHostView={isHostView}
                onAction={onAction}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
