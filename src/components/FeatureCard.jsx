export default function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-7 hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 transition-all duration-300">
      <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-5">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <h3 className="font-display font-semibold text-slate-900 text-lg mb-2">{title}</h3>
      <p className="font-body text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
