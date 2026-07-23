import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "../Logo.jsx";

/** `backTo` defaults to the settings hub; pass "/dashboard" from the hub itself. */
export default function SettingsHeader({ backTo = "/settings", backLabel = "Back" }) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7" />
          <span className="font-display font-semibold text-slate-900 dark:text-slate-100">Voxly</span>
        </div>
        <span className="w-16" aria-hidden="true" />
      </div>
    </header>
  );
}
