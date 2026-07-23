import { Link } from "react-router-dom";
import Logo from "../Logo.jsx";
import { MessageCircle, Users, Radio } from "lucide-react";

const SIDE_POINTS = [
  { icon: MessageCircle, text: "Real-time conversations that never miss a beat" },
  { icon: Users, text: "Communities built around what you actually care about" },
  { icon: Radio, text: "Voice rooms that turn talk into togetherness" },
];

/**
 * Two-column layout used by every auth screen:
 *  - Left: brand panel (hidden on small screens)
 *  - Right: the actual form content, passed in as children
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen w-full flex bg-white font-body">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_30%)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-lg">Voxly</span>
          </Link>

          <div className="max-w-sm">
            <h2 className="font-display text-3xl font-semibold leading-tight mb-6">
              Where conversations become community.
            </h2>
            <ul className="space-y-4">
              {SIDE_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-brand-50 text-sm leading-relaxed pt-1">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-brand-100 text-xs">© {new Date().getFullYear()} Voxly. All rights reserved.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <Logo />
            <span className="font-display font-semibold text-lg text-slate-900">Voxly</span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-8 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
