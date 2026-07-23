import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-6 text-center font-body">
      <Logo className="w-10 h-10 mb-6" />
      <h1 className="font-display text-3xl font-semibold text-slate-900 mb-2">Page not found</h1>
      <p className="text-slate-500 text-sm mb-8">The page you're looking for doesn't exist or has moved.</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
      >
        Back to home
      </Link>
    </div>
  );
}
