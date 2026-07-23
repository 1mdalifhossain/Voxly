import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * One row inside a SettingsSection. Renders as a <Link> if `to` is given
 * (chevron shown automatically), a <button> if `onClick` is given, or a
 * plain row if neither (for rows that just host a control via `right`).
 */
export default function SettingsRow({ icon: Icon, label, description, to, onClick, right, danger = false, disabled = false }) {
  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0
              ${danger ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
          >
            <Icon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${danger ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
            {label}
          </p>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 pl-3">
        {right}
        {(to || onClick) && !right && <ChevronRight className="w-4 h-4 text-slate-400" />}
      </div>
    </>
  );

  const rowClass =
    "flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 w-full text-left transition-colors";

  if (to) {
    return (
      <Link to={to} className={`${rowClass} hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${rowClass} hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50`}>
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
