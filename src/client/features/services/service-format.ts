export function formatBuildDuration(startedAt: null | string, finishedAt: null | string, nowMs: number) {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  const end = finishedAt ? Date.parse(finishedAt) : nowMs;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
