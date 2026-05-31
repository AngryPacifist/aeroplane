import type { MaintenanceHistoryPoint } from "../../api";

function chartValue(point: MaintenanceHistoryPoint, metric: "disk" | "docker" | "builds") {
  if (metric === "disk") return point.diskUsedPercent;
  if (metric === "docker") return point.dockerReclaimableBytes;
  return point.buildArtifactsBytes;
}

export function MaintenanceHistoryChart({
  history,
  metric,
  label
}: {
  history: MaintenanceHistoryPoint[];
  metric: "disk" | "docker" | "builds";
  label: string;
}) {
  const points = history.slice(-24);
  const values = points.map((point) => chartValue(point, metric)).filter((value): value is number => value !== null && Number.isFinite(value));
  const max = metric === "disk" ? 100 : Math.max(...values, 1);

  return (
    <div className="border border-zinc-800 bg-zinc-950/45 p-4">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className="mt-4 flex h-20 items-end gap-1">
        {points.length === 0 ? (
          <div className="grid h-full w-full place-items-center text-xs text-zinc-600">No samples yet</div>
        ) : (
          points.map((point) => {
            const value = chartValue(point, metric);
            const height = value === null ? 2 : Math.max(4, Math.round((value / max) * 100));
            return (
              <div
                key={`${metric}-${point.checkedAt}`}
                className="min-w-1 flex-1 bg-[#4FB8B2]/45"
                style={{ height: `${height}%` }}
                title={`${new Date(point.checkedAt).toLocaleString()} - ${value ?? "unknown"}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
