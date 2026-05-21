export function formatTime(value: null | string) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function shortSha(sha: null | string) {
  return sha ? sha.slice(0, 7) : "latest";
}

export function formatRelativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(delta / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.max(1, Math.round(hours / 24));
  return `${days}d ago`;
}
