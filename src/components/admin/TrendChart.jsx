/**
 * Minimal bar chart, no charting library required. `data` is
 * `[{ date: "2026-07-10", count: 4 }, ...]` as produced by lib/admin.js.
 */
export default function TrendChart({ data, color = "#2563EB", height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = (d.count / max) * (height - 24);
          return (
            <rect
              key={d.date}
              x={i * barWidth + barWidth * 0.15}
              y={height - 24 - barHeight}
              width={barWidth * 0.7}
              height={Math.max(barHeight, d.count > 0 ? 2 : 0)}
              rx={1.5}
              fill={color}
              opacity={0.9}
            >
              <title>
                {d.date}: {d.count}
              </title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        <span>{formatShort(data[0]?.date)}</span>
        <span>{formatShort(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function formatShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
