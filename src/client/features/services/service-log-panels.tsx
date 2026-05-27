import { LeftToRightListStarIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { DeploymentLog, RuntimeLog } from "../../api";
import { AppIcon } from "../../components/ui/primitives";

export function DeploymentLogsPanel({
  logs,
  emptyLabel,
  title,
  meta,
  actions
}: {
  logs: DeploymentLog[];
  emptyLabel: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            <AppIcon icon={LeftToRightListStarIcon} size={16} />
            {title}
          </div>
          {meta ? <div className="mt-1 text-xs text-zinc-400">{meta}</div> : null}
        </div>
        {actions ? <div className="shrink-0 whitespace-nowrap">{actions}</div> : null}
      </div>
      <pre ref={ref} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all font-mono text-sm leading-6 text-zinc-200">
        {logs.length > 0 ? logs.map((log) => `[${new Date(log.createdAt).toLocaleTimeString()}] ${log.line}`).join("\n") : emptyLabel}
      </pre>
    </div>
  );
}

export function RuntimeLogsPanel({ logs, emptyLabel, title }: { logs: RuntimeLog[]; emptyLabel: string; title: string }) {
  const ref = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
        <AppIcon icon={LeftToRightListStarIcon} size={16} />
        {title}
      </div>
      <pre ref={ref} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all font-mono text-sm leading-6 text-zinc-200">
        {logs.length > 0 ? logs.map((log) => `[${new Date(log.createdAt).toLocaleTimeString()}] ${log.line}`).join("\n") : emptyLabel}
      </pre>
    </div>
  );
}
