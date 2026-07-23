import { useState } from "react";
import { X, Loader2, Mic } from "lucide-react";
import { createRoom } from "../../lib/rooms.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const TITLE_LIMIT = 100;
const DESCRIPTION_LIMIT = 280;

/** Modal for starting a new voice room. On success, navigates the host straight into it. */
export default function CreateRoomModal({ hostId, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEscapeKey(onClose, !submitting);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const { data, error } = await createRoom({ hostId, title, description });
    if (error) {
      setError(error.message || "Couldn't start the room. Please try again.");
      setSubmitting(false);
      return;
    }
    onCreated(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => !submitting && onClose()} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mic className="w-4 h-4 text-brand-600" />
            Start a Voice Room
          </div>
          <button
            onClick={() => !submitting && onClose()}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="room-title" className="block text-sm font-medium text-slate-700 mb-1.5">
              What's it about?
            </label>
            <input
              id="room-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_LIMIT))}
              placeholder="e.g. Friday night design chat"
              autoFocus
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {title.length}/{TITLE_LIMIT}
            </p>
          </div>

          <div>
            <label htmlFor="room-description" className="block text-sm font-medium text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))}
              placeholder="Give people a reason to drop in"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {description.length}/{DESCRIPTION_LIMIT}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl py-2.5 transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {submitting ? "Starting…" : "Go live"}
          </button>
        </form>
      </div>
    </div>
  );
}
