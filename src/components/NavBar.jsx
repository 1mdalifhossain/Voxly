import { useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo.jsx";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Screenshots", href: "#screens" },
  { label: "Company", href: "#footer" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-semibold text-lg text-slate-900">Voxly</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 font-body text-sm font-medium text-slate-600">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-brand-600 transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button className="font-body text-sm font-medium text-slate-700 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
            Login
          </button>
          <button className="font-body text-sm font-semibold text-white bg-brand-600 px-5 py-2.5 rounded-full hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200">
            Get Started
          </button>
        </div>

        <button
          className="md:hidden text-slate-700"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 flex flex-col gap-4 font-body text-sm">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="text-slate-600" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <button className="flex-1 text-slate-700 border border-slate-200 rounded-full py-2 font-medium">
              Login
            </button>
            <button className="flex-1 text-white bg-brand-600 rounded-full py-2 font-semibold">
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
