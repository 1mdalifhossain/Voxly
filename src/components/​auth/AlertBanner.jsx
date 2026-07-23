import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Small inline banner for surfacing form-level success or error messages.
 */
export default function AlertBanner({ type = "error", children }) {
  if (!children) return null;

  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm mb-5
        ${isError ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
