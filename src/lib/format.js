/** Short relative time for feed timestamps: "now", "5m", "3h", "2d", or a date. */
export function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
}
