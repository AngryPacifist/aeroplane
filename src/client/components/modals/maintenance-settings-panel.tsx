import { Alert02Icon, CheckmarkCircle02Icon, Delete02Icon, HardDriveIcon, Refresh03Icon } from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type MaintenanceCleanupTarget, type MaintenanceCommandResult, type SystemMaintenanceInfo } from "../../api";
import { formatBytes } from "../../lib/format";
import { AppIcon, shellButton, statusClass } from "../ui/primitives";
import { MaintenanceHistoryChart } from "./maintenance-history-chart";
import { MaintenanceUsageBar } from "./maintenance-usage-bar";

const safeCleanupTargets = [
  "docker-containers",
  "docker-images",
  "docker-build-cache",
  "apt-cache",
  "journals",
  "build-artifacts"
] satisfies MaintenanceCleanupTarget[];

function diskTone(percent: number) {
  if (percent >= 90) return "rose" as const;
  if (percent >= 80) return "amber" as const;
  return "teal" as const;
}

function healthLabel(info: SystemMaintenanceInfo | null) {
  if (!info) return "Not checked";
  if (info.alerts.length > 0) return `${info.alerts.length} issue${info.alerts.length === 1 ? "" : "s"}`;
  return "Healthy";
}

function healthClass(info: SystemMaintenanceInfo | null) {
  if (!info) return statusClass("unknown");
  if (info.alerts.some((alert) => alert.includes("90%"))) return statusClass("failed");
  if (info.alerts.length > 0) return statusClass("building");
  return statusClass("active");
}

function pathMetric(info: SystemMaintenanceInfo | null, id: string) {
  return info?.paths.find((item) => item.id === id) ?? null;
}

function CommandLog({ commands }: { commands: MaintenanceCommandResult[] }) {
  if (commands.length === 0) return null;

  return (
    <section className="border border-zinc-800 bg-zinc-950/45">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h4 className="font-hero text-base tracking-tight text-zinc-100">Cleanup activity</h4>
        <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${commands.every((command) => command.ok) ? statusClass("active") : statusClass("failed")}`}>
          {commands.every((command) => command.ok) ? "Complete" : "Check output"}
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

export function MaintenanceSettingsPanel({ open }: { open: boolean }) {
  const [info, setInfo] = useState<SystemMaintenanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<"" | "safe" | "volumes">("");
  const [commands, setCommands] = useState<MaintenanceCommandResult[]>([]);
  const [confirmVolumes, setConfirmVolumes] = useState(false);
  const [error, setError] = useState("");

  const loadMaintenance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setInfo(await api.systemMaintenance());
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load maintenance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadMaintenance();
  }, [loadMaintenance, open]);

  const dockerMax = useMemo(() => {
    return Math.max(...(info?.docker.rows.map((row) => row.sizeBytes ?? 0) ?? []), 1);
  }, [info]);

  async function runCleanup(mode: "safe" | "volumes", targets: MaintenanceCleanupTarget[]) {
    setCleanupMode(mode);
    setError("");
    setCommands([]);
    try {
      const result = await api.runSystemMaintenanceCleanup(targets);
      setInfo(result.info);
      setCommands(result.commands);
      setConfirmVolumes(false);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Cleanup failed");
    } finally {
      setCleanupMode("");
    }
  }

  const diskPercent = info?.disk?.usedPercent ?? 0;
  const dataPath = pathMetric(info, "data");
  const buildPath = pathMetric(info, "build-artifacts");
  const backupsPath = pathMetric(info, "backups");
  const aptPath = pathMetric(info, "apt-cache");
  const logsPath = pathMetric(info, "system-logs");

  return (
    <div className="space-y-5">
      <section className="border border-zinc-800 bg-zinc-950/45 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Maintenance</div>
            <h3 className="mt-2 font-hero text-2xl tracking-tight text-zinc-100">Host health and cleanup</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Watch disk pressure, Docker growth, logs, and Aeroplane build artifacts before they take the VPS down.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${healthClass(info)}`}>
              {loading ? "Checking" : healthLabel(info)}
            </span>
            <button type="button" className={shellButton("secondary")} onClick={() => void loadMaintenance()} disabled={loading || Boolean(cleanupMode)}>
              <AppIcon icon={Refresh03Icon} size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {error ? <div className="mt-5 border border-rose-500/35 bg-rose-950/25 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        {info?.alerts.length ? (
          <div className="mt-5 grid gap-2">
            {info.alerts.map((alert) => (
              <div key={alert} className="flex items-center gap-2 border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                <AppIcon icon={Alert02Icon} size={15} />
                {alert}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <MaintenanceUsageBar
          label="Root disk"
          value={info?.disk ? formatBytes(info.disk.usedBytes) : loading ? "Loading" : "Unknown"}
          detail={info?.disk ? `${formatBytes(info.disk.availableBytes)} available on ${info.disk.mount}` : "Measured from the VPS root filesystem."}
          percent={diskPercent}
          tone={diskTone(diskPercent)}
        />
        <MaintenanceUsageBar
          label="Docker reclaimable"
          value={formatBytes(info?.docker.reclaimableBytes ?? null)}
          detail={info?.docker.available ? "Unused Docker resources that cleanup can reclaim." : (info?.docker.error ?? "Docker metrics unavailable.")}
          percent={info?.disk ? Math.min(100, ((info.docker.reclaimableBytes || 0) / info.disk.totalBytes) * 100) : 0}
          tone={info?.docker.reclaimableBytes && info.docker.reclaimableBytes > 3 * 1000 ** 3 ? "amber" : "teal"}
        />
        <MaintenanceUsageBar
          label="Build artifacts"
          value={formatBytes(buildPath?.bytes ?? null)}
          detail={buildPath?.available ? "Old source checkouts and build workspaces." : "No build artifact directory yet."}
          percent={info?.disk && buildPath?.bytes ? Math.min(100, (buildPath.bytes / info.disk.totalBytes) * 100) : 0}
          tone={buildPath?.bytes && buildPath.bytes > 2 * 1000 ** 3 ? "amber" : "teal"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MaintenanceHistoryChart history={info?.history ?? []} metric="disk" label="Disk trend" />
        <MaintenanceHistoryChart history={info?.history ?? []} metric="docker" label="Docker reclaimable trend" />
        <MaintenanceHistoryChart history={info?.history ?? []} metric="builds" label="Build artifact trend" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="border border-zinc-800 bg-zinc-950/45">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h4 className="font-hero text-base tracking-tight text-zinc-100">Docker storage</h4>
            <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${info?.docker.available ? statusClass("active") : statusClass("failed")}`}>
              {info?.docker.available ? "Available" : "Unavailable"}
            </span>
          </div>
          <div className="divide-y divide-zinc-800">
            {(info?.docker.rows ?? []).length > 0 ? (
              info?.docker.rows.map((row) => {
                const percent = Math.max(2, Math.min(100, ((row.sizeBytes ?? 0) / dockerMax) * 100));
                return (
                  <div key={row.type} className="grid gap-3 px-4 py-3 md:grid-cols-[160px_minmax(0,1fr)_220px] md:items-center">
                    <div>
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{row.type}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {row.activeCount ?? "?"}/{row.totalCount ?? "?"} active
                      </div>
                    </div>
                    <div className="h-2 border border-zinc-800 bg-black/45">
                      <div className="h-full bg-zinc-500" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="font-mono text-xs text-zinc-300">
                      {formatBytes(row.sizeBytes)}
                      <span className="ml-2 text-zinc-600">reclaim {formatBytes(row.reclaimableBytes)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid min-h-28 place-items-center px-4 py-8 text-sm text-zinc-500">{loading ? "Loading Docker usage..." : "No Docker usage data."}</div>
            )}
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950/45 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]">
              <AppIcon icon={HardDriveIcon} size={17} />
            </div>
            <div>
              <h4 className="font-hero text-base tracking-tight text-zinc-100">Cleanup</h4>
              <p className="text-xs text-zinc-500">Free space without touching active services.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm text-zinc-300">
            <div className="flex justify-between border border-zinc-800 px-3 py-2">
              <span>Aeroplane data</span>
              <span className="font-mono text-xs text-zinc-500">{formatBytes(dataPath?.bytes ?? null)}</span>
            </div>
            <div className="flex justify-between border border-zinc-800 px-3 py-2">
              <span>Backups</span>
              <span className="font-mono text-xs text-zinc-500">{formatBytes(backupsPath?.bytes ?? null)}</span>
            </div>
            <div className="flex justify-between border border-zinc-800 px-3 py-2">
              <span>APT cache</span>
              <span className="font-mono text-xs text-zinc-500">{formatBytes(aptPath?.bytes ?? null)}</span>
            </div>
            <div className="flex justify-between border border-zinc-800 px-3 py-2">
              <span>System logs</span>
              <span className="font-mono text-xs text-zinc-500">{formatBytes(logsPath?.bytes ?? null)}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className={shellButton("primary")} onClick={() => void runCleanup("safe", safeCleanupTargets)} disabled={Boolean(cleanupMode) || loading}>
              <AppIcon icon={Refresh03Icon} size={14} className={cleanupMode === "safe" ? "animate-spin" : ""} />
              Safe cleanup
            </button>

            {confirmVolumes ? (
              <div className="border border-rose-500/35 bg-rose-950/20 p-3">
                <p className="text-xs leading-relaxed text-rose-100">Delete unused Docker volumes? This will not remove attached volumes, but it can delete old database data left behind by removed containers.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className={shellButton("danger")} onClick={() => void runCleanup("volumes", ["docker-volumes"])} disabled={Boolean(cleanupMode)}>
                    <AppIcon icon={Delete02Icon} size={14} className={cleanupMode === "volumes" ? "animate-spin" : ""} />
                    Delete volumes
                  </button>
                  <button type="button" className={shellButton("ghost")} onClick={() => setConfirmVolumes(false)} disabled={Boolean(cleanupMode)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className={shellButton("danger")} onClick={() => setConfirmVolumes(true)} disabled={Boolean(cleanupMode) || loading}>
                <AppIcon icon={Delete02Icon} size={14} />
                Deep cleanup volumes
              </button>
            )}
          </div>
        </div>
      </section>

      <CommandLog commands={commands} />
    </div>
  );
}
