export default function SettingsSection({ title, children }) {
  return (
    <div className="mb-6">
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1 mb-2">
          {title}
        </h2>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
