import { useState } from "react";
import { Ban, Loader2, X } from "lucide-react";

/** Confirm banning a user, with a reason that's stored on their profile and shown to them. */
export default function BanUserModal({ username, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    setSubmitting(true);
    const result = await onConfirm(reason);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error.message || "Something went wrong. Please try again.");
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
          <Ban className="w-5 h-5" />
        </div>

        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
          Ban @{username}?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          They'll be signed out of posting, commenting, and starting rooms until unbanned. Their existing content
          stays up unless you remove it separately.
        </p>

        <label htmlFor="ban-reason" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          Reason <span className="text-slate-400 font-normal">(shown to the user)</span>
        </label>
        <textarea
          id="ban-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Repeated harassment in voice rooms"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 text-sm py-2.5 px-3.5 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

        <div className="flex gap-3 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 rounded-full py-2.5 hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Banning…" : "Ban user"}
          </button>
        </div>
      </div>
    </div>
  );
}
