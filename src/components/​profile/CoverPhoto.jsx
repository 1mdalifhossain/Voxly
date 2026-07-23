/** Wide banner image shown at the top of a profile, with a gradient fallback. */
export default function CoverPhoto({ src, className = "" }) {
  return (
    <div className={`w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-800 ${className}`}>
      {src && <img src={src} alt="Cover" className="w-full h-full object-cover" />}
    </div>
  );
}
