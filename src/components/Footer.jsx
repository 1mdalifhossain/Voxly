import Logo from "./Logo.jsx";

const FOOTER_COLUMNS = [
  { heading: "Product", links: ["Features", "Screenshots", "Voice Rooms"] },
  { heading: "Company", links: ["About", "Careers", "Blog"] },
  { heading: "Legal", links: ["Privacy", "Terms", "Guidelines"] },
];

export default function Footer() {
  return (
    <footer id="footer" className="bg-slate-900 text-slate-300 pt-20 pb-8 px-6">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Logo />
            <span className="font-display font-semibold text-lg text-white">Voxly</span>
          </div>
          <p className="font-body text-sm text-slate-400 max-w-xs leading-relaxed">
            A social platform for people who'd rather talk than scroll.
          </p>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="font-body font-semibold text-white text-sm mb-4">{col.heading}</p>
            <ul className="space-y-3 font-body text-sm text-slate-400">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-brand-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-body text-xs text-slate-500">© 2026 Voxly. All rights reserved.</p>
        <div className="flex gap-5 font-body text-xs text-slate-500">
          <a href="#" className="hover:text-brand-400">Privacy</a>
          <a href="#" className="hover:text-brand-400">Terms</a>
          <a href="#" className="hover:text-brand-400">Contact</a>
        </div>
      </div>
    </footer>
  );
}
