import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

/**
 * Generic "are you sure" modal for admin actions (delete post, end room,
 * resolve/dismiss a report). `onConfirm` may return `{ error }`.
 */
export default function ConfirmActionModal({
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onClose,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    setSubmitting(true);
    const result = await onConfirm();
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

        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
            danger
              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{description}</p>}

        {error && <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>}

        <div className="flex gap-3 mt-2">
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
            className={`flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 transition-colors disabled:opacity-40 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
