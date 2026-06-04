import { Delete02Icon, HardDriveIcon, Refresh03Icon } from "@hugeicons/core-free-icons";
import type { MaintenanceCleanupTarget, SystemMaintenanceInfo } from "../../api";
import { formatBytes } from "../../lib/format";
import { AppIcon, shellButton } from "../ui/primitives";
import { pathMetric, safeCleanupTargets, topDockerReclaimableRow } from "./maintenance-utils";

export function MaintenanceCleanupCard({
  info,
  loading,
  cleanupMode,
  confirmVolumes,
  onConfirmVolumesChange,
  onRunCleanup
}: {
  info: SystemMaintenanceInfo | null;
  loading: boolean;
  cleanupMode: "" | "safe" | "volumes";
  confirmVolumes: boolean;
  onConfirmVolumesChange: (confirm: boolean) => void;
  onRunCleanup: (mode: "safe" | "volumes", targets: MaintenanceCleanupTarget[]) => void;
}) {
  const dataPath = pathMetric(info, "data");
  const backupsPath = pathMetric(info, "backups");
  const aptPath = pathMetric(info, "apt-cache");
  const logsPath = pathMetric(info, "system-logs");
  const topDockerRow = topDockerReclaimableRow(info);

  return (
    <div className="border border-zinc-800 bg-zinc-950/45 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]">
          <AppIcon icon={HardDriveIcon} size={17} />
        </div>
        <div>
          <h4 className="font-hero text-base tracking-tight text-zinc-100">Cleanup</h4>
          <p className="text-xs text-zinc-500">Current disk and Docker cleanup targets.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm text-zinc-300">
        <div className="flex justify-between gap-3 border border-zinc-800 px-3 py-2">
          <span>Top Docker candidate</span>
          <span className="shrink-0 font-mono text-xs text-zinc-500">{topDockerRow ? `${formatBytes(topDockerRow.reclaimableBytes)} ${topDockerRow.type}` : "0 B"}</span>
        </div>
        <div className="flex justify-between gap-3 border border-zinc-800 px-3 py-2">
          <span>Aeroplane data</span>
          <span className="shrink-0 font-mono text-xs text-zinc-500">{formatBytes(dataPath?.bytes ?? null)}</span>
        </div>
        <div className="flex justify-between gap-3 border border-zinc-800 px-3 py-2">
          <span>Backups</span>
          <span className="shrink-0 font-mono text-xs text-zinc-500">{formatBytes(backupsPath?.bytes ?? null)}</span>
        </div>
        <div className="flex justify-between gap-3 border border-zinc-800 px-3 py-2">
          <span>APT cache</span>
          <span className="shrink-0 font-mono text-xs text-zinc-500">{formatBytes(aptPath?.bytes ?? null)}</span>
        </div>
        <div className="flex justify-between gap-3 border border-zinc-800 px-3 py-2">
          <span>System logs</span>
          <span className="shrink-0 font-mono text-xs text-zinc-500">{formatBytes(logsPath?.bytes ?? null)}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button type="button" className={shellButton("primary")} onClick={() => onRunCleanup("safe", safeCleanupTargets)} disabled={Boolean(cleanupMode) || loading}>
          <AppIcon icon={Refresh03Icon} size={14} className={cleanupMode === "safe" ? "animate-spin" : ""} />
          Safe cleanup
        </button>

        {confirmVolumes ? (
          <div className="border border-rose-500/35 bg-rose-950/20 p-3">
            <p className="text-xs leading-relaxed text-rose-100">Delete unused Docker volumes? This will not remove attached volumes, but it can delete old database data left behind by removed containers.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={shellButton("danger")} onClick={() => onRunCleanup("volumes", ["docker-volumes"])} disabled={Boolean(cleanupMode)}>
                <AppIcon icon={Delete02Icon} size={14} className={cleanupMode === "volumes" ? "animate-spin" : ""} />
                Delete volumes
              </button>
              <button type="button" className={shellButton("ghost")} onClick={() => onConfirmVolumesChange(false)} disabled={Boolean(cleanupMode)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={shellButton("danger")} onClick={() => onConfirmVolumesChange(true)} disabled={Boolean(cleanupMode) || loading}>
            <AppIcon icon={Delete02Icon} size={14} />
            Clean volumes
          </button>
        )}
      </div>
    </div>
  );
}
