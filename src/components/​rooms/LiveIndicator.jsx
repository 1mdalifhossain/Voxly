/** Small pulsing "LIVE" badge used on room cards and the room header. */
export default function LiveIndicator({ size = "md" }) {
  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-red-50 text-red-600 font-semibold uppercase tracking-wide ${sizes[size]}`}
    >
      <span className="relative flex w-1.5 h-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
      </span>
      Live
    </span>
  );
}
