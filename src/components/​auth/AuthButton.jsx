import { Loader2 } from "lucide-react";

/**
 * Primary call-to-action button used across auth forms.
 * Shows a spinner and disables itself while `loading` is true.
 */
export default function AuthButton({
  children,
  loading = false,
  type = "submit",
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={`w-full inline-flex items-center justify-center gap-2 rounded-full
        bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-200
        transition-colors hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
