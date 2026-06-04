import { Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import type { MaintenanceCommandResult } from "../../api";
import { AppIcon, statusClass } from "../ui/primitives";

export function MaintenanceCommandLog({ commands }: { commands: MaintenanceCommandResult[] }) {
  if (commands.length === 0) return null;

  const complete = commands.every((command) => command.ok);

  return (
    <section className="border border-zinc-800 bg-zinc-950/45">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h4 className="font-hero text-base tracking-tight text-zinc-100">Cleanup activity</h4>
        <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${complete ? statusClass("active") : statusClass("failed")}`}>
          {complete ? "Complete" : "Check output"}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto p-4">
        <div className="space-y-4">
          {commands.map((command) => (
            <div key={command.label}>
              <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                <AppIcon icon={command.ok ? CheckmarkCircle02Icon : Alert02Icon} size={14} className={command.ok ? "text-emerald-300" : "text-rose-300"} />
                {command.label}
              </div>
              <pre className="mt-2 overflow-x-auto border border-zinc-800 bg-black/35 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400">
                {command.output || "Done."}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
