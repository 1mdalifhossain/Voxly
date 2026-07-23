import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, FileText, Flag, Mic, BarChart3, ArrowLeft, X } from "lucide-react";
import Logo from "../Logo.jsx";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/posts", label: "Posts", icon: FileText },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/rooms", label: "Voice Rooms", icon: Mic },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-600 text-white shadow-sm shadow-brand-900/20"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`
          }
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Fixed desktop sidebar for the admin panel. */
export default function AdminSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-slate-950 border-r border-slate-800">
      <SidebarHeader />
      <NavItems />
      <SidebarFooter />
    </aside>
  );
}

/** Slide-over sidebar for mobile, toggled from AdminLayout's top bar. */
export function AdminMobileSidebar({ open, onClose }) {
  useEscapeKey(onClose, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside className="absolute inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
          <SidebarBrand />
          <button onClick={onClose} aria-label="Close menu" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <NavItems onNavigate={onClose} />
        <SidebarFooter />
      </aside>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2">
      <Logo className="w-6 h-6" />
      <span className="font-display font-semibold text-white text-sm">Voxly Admin</span>
    </div>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center h-16 px-5 border-b border-slate-800">
      <SidebarBrand />
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="px-3 py-4 border-t border-slate-800">
      <NavLink
        to="/dashboard"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Voxly
      </NavLink>
    </div>
  );
}
