import type { ToolCheck } from "../../api";

export function SystemHealthPill({ tools }: { tools: ToolCheck[] }) {
  const okCount = tools.filter((tool) => tool.ok).length;
  const totalCount = tools.length;
  const allOk = totalCount > 0 && okCount === totalCount;
  const label = totalCount === 0 ? "Checking" : allOk ? "System ready" : `${okCount}/${totalCount} ready`;
  const detail = tools.length > 0 ? tools.map((tool) => `${tool.name}: ${tool.ok ? "ok" : tool.detail}`).join("\n") : "Checking host tools";

  return (
    <div
      className="inline-flex h-9 items-center gap-2 border border-zinc-800 bg-zinc-900/55 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400"
      title={detail}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${allOk ? "bg-[#4FB8B2]" : "bg-amber-400"}`} />
      <span>{label}</span>
    </div>
  );
}
