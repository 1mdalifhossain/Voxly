import { useState } from "react";
import { Menu } from "lucide-react";
import AdminSidebar, { AdminMobileSidebar } from "./AdminSidebar.jsx";
import Avatar from "../profile/Avatar.jsx";
import { useProfile } from "../../context/ProfileContext.jsx";

/**
 * Wraps every /admin/* page: fixed sidebar (desktop) or slide-over (mobile),
 * a top bar with the page title, and a content well.
 */
export default function AdminLayout({ title, description, actions, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { profile } = useProfile();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body transition-colors">
      <AdminSidebar />
      <AdminMobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 px-4 sm:px-6 h-16">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h1>
              {description && (
                <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
              )}
            </div>

            {actions}

            {profile && (
              <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-100 dark:border-slate-800">
                <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="sm" />
                <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200">
                  {profile.display_name || profile.username}
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="px-4 sm:px-6 py-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
