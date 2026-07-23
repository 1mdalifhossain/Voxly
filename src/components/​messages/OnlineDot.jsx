const SIZES = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-3.5 h-3.5",
};

/** Small green ring-bordered dot meant to sit in the bottom-right corner of an Avatar. */
export default function OnlineDot({ online, size = "sm", className = "" }) {
  if (!online) return null;
  return (
    <span
      className={`absolute bottom-0 right-0 ${SIZES[size] || SIZES.sm} rounded-full bg-emerald-500 ring-2 ring-white ${className}`}
      aria-label="Online"
    />
  );
}
