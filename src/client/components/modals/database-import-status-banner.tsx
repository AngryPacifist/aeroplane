import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, DatabaseImportIcon, WorkflowSquare07Icon } from "@hugeicons/core-free-icons";
import type { DatabaseDataImport } from "../../api";
import { formatBytes, formatTime } from "../../lib/format";
import { AppIcon, statusClass } from "../ui/primitives";

function statusIcon(status: string) {
  if (status === "succeeded") return CheckmarkCircle02Icon;
  if (status === "failed") return Alert02Icon;
  if (status === "queued") return DatabaseImportIcon;
  return WorkflowSquare07Icon;
}

function statusLabel(status: string) {
  if (status === "succeeded") return "Imported";
  if (status === "failed") return "Failed";
  if (status === "queued") return "Queued";
  return "Importing";
}

function statusTone(status: string) {
  if (status === "succeeded") return "active";
  if (status === "failed") return "failed";
  if (status === "queued" || status === "running") return "building";
  return "idle";
}

export function DatabaseImportStatusBanner({ dataImport, onDismiss }: { dataImport: DatabaseDataImport; onDismiss: () => void }) {
  const Icon = statusIcon(dataImport.status);
  const active = dataImport.status === "queued" || dataImport.status === "running";
  const details = dataImport.status === "succeeded"
    ? `Imported ${formatBytes(dataImport.dumpSizeBytes)} from ${dataImport.sourceLabel}.`
    : dataImport.status === "failed"
    ? dataImport.error ?? "The background import failed."
    : `${dataImport.sourceLabel} data import is running in the background.`;

  return (
    <div className="mb-4 border border-[#4FB8B2]/30 bg-[#4FB8B2]/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center border border-[#4FB8B2]/25 bg-zinc-950/40 text-[#7fe3dd]">
            <AppIcon icon={Icon} size={17} className={active ? "animate-pulse" : ""} />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7fe3dd]">Database data import</div>
            <div className="mt-1 truncate text-sm text-zinc-200">{details}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass(statusTone(dataImport.status))}`}>
            {statusLabel(dataImport.status)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {formatTime(dataImport.finishedAt ?? dataImport.startedAt ?? dataImport.createdAt)}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center border border-zinc-800 bg-zinc-950/45 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
            onClick={onDismiss}
            aria-label="Dismiss database import status"
            title="Dismiss"
          >
            <AppIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
