const SIZES = {
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-lg",
  lg: "w-24 h-24 text-2xl",
  xl: "w-32 h-32 text-3xl",
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

/** Circular avatar image with an initials fallback when there's no photo. */
export default function Avatar({ src, name, size = "md", className = "", ringed = false }) {
  const sizeClasses = SIZES[size] || SIZES.md;
  const ring = ringed ? "ring-4 ring-white" : "";

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center font-display font-semibold text-brand-700 ${sizeClasses} ${ring} ${className}`}
    >
      {src ? (
        <img src={src} alt={name ? `${name}'s avatar` : "Avatar"} className="w-full h-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
