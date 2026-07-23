import Logo from "../Logo.jsx";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-white">
      <div className="animate-pulse">
        <Logo className="w-10 h-10" />
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}
