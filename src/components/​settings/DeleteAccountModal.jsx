import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccountModal({ onConfirm, onClose }) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    setSubmitting(true);
    const { error } = await onConfirm();
    setSubmitting(false);
    if (error) setError(error.message || "Something went wrong. Please try again.");
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
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
          Delete your account?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          This removes your profile, photos, and personal details, and signs you out everywhere. Your
          posts and comments stay attributed to a deactivated account. This can't be undone from here.
        </p>

        <label htmlFor="delete-confirm" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
        </label>
        <input
          id="delete-confirm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 text-sm py-2.5 px-3.5 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
          autoComplete="off"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={input !== CONFIRM_WORD || submitting}
            onClick={handleConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 rounded-full py-2.5 hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
