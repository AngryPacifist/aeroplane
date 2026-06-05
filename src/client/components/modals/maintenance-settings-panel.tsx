import { Alert02Icon, Refresh03Icon } from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type MaintenanceCleanupTarget, type MaintenanceCommandResult, type SystemMaintenanceInfo } from "../../api";
import { AppIcon, shellButton } from "../ui/primitives";
import { MaintenanceCleanupCard } from "./maintenance-cleanup-card";
import { MaintenanceCommandLog } from "./maintenance-command-log";
import { MaintenanceDockerStorage } from "./maintenance-docker-storage";
import { MaintenanceHistoryChart } from "./maintenance-history-chart";
import { MaintenanceSummaryGrid } from "./maintenance-summary-grid";
import { healthClass, healthLabel } from "./maintenance-utils";

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

  return (
    <div className="space-y-5">
      <section className="border border-zinc-800 bg-zinc-950/45 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Maintenance</div>
            <h3 className="mt-2 font-hero text-2xl tracking-tight text-zinc-100">Host health and cleanup</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Watch disk pressure, Docker growth, logs, and Aeroplane build artifacts before they take the server down.
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

      <MaintenanceSummaryGrid info={info} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-3">
        <MaintenanceHistoryChart history={info?.history ?? []} metric="disk" label="Disk trend" />
        <MaintenanceHistoryChart history={info?.history ?? []} metric="docker" label="Docker reclaimable trend" />
        <MaintenanceHistoryChart history={info?.history ?? []} metric="builds" label="Build artifact trend" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <MaintenanceDockerStorage info={info} loading={loading} dockerMax={dockerMax} />
        <MaintenanceCleanupCard
          info={info}
          loading={loading}
          cleanupMode={cleanupMode}
          confirmVolumes={confirmVolumes}
          onConfirmVolumesChange={setConfirmVolumes}
          onRunCleanup={(mode, targets) => void runCleanup(mode, targets)}
        />
      </section>

      <MaintenanceCommandLog commands={commands} />
    </div>
  );
}
