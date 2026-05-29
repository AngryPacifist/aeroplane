import {
  Archive01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  Delete02Icon,
  Download01Icon,
  HardDriveIcon,
  Refresh03Icon
} from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useState } from "react";
import { api, type DatabaseBackup, type R2SettingsStatus } from "../../api";
import { AppIcon, shellButton, statusClass } from "../ui/primitives";

function formatBytes(value: number | null) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function backupStatusClass(status: DatabaseBackup["status"]) {
  if (status === "succeeded") return statusClass("active");
  if (status === "running") return statusClass("building");
  return statusClass("failed");
}

function storageLabel(backup: DatabaseBackup) {
  if (backup.storage === "disk+r2") return backup.r2Key ? "Disk + R2" : "Disk, R2 failed";
  return "Disk";
}

export function DatabaseBackupsPanel({ serviceId }: { serviceId: string }) {
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [r2, setR2] = useState<R2SettingsStatus | null>(null);
  const [busy, setBusy] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBackups = useCallback(async () => {
    setBusy((current) => current || "load");
    setError("");
    try {
      const result = await api.databaseBackups(serviceId);
      setBackups(result.backups);
      setR2(result.r2);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load backups");
    } finally {
      setBusy((current) => (current === "load" ? "" : current));
    }
  }, [serviceId]);

  useEffect(() => {
    void loadBackups();
  }, [loadBackups]);

  async function createBackup(storage: "disk" | "disk+r2") {
    setBusy(storage);
    setError("");
    setSuccess("");
    try {
      const result = await api.createDatabaseBackup(serviceId, storage);
      setBackups((current) => [result.backup, ...current.filter((backup) => backup.id !== result.backup.id)]);
      setSuccess(storage === "disk+r2" ? "Backup saved to disk and uploaded to R2." : "Backup saved to disk.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create backup");
      await loadBackups();
    } finally {
      setBusy("");
    }
  }

  async function deleteBackup(backupId: string) {
    setBusy(`delete:${backupId}`);
    setError("");
    setSuccess("");
    try {
      await api.deleteDatabaseBackup(serviceId, backupId);
      setBackups((current) => current.filter((backup) => backup.id !== backupId));
      setDeleteId("");
      setSuccess("Backup deleted.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not delete backup");
    } finally {
      setBusy("");
    }
  }

  const loading = busy === "load";
  const creating = busy === "disk" || busy === "disk+r2";
  const r2Connected = r2?.connected ?? false;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="font-hero text-xl text-zinc-100">Backups</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={shellButton("secondary")} onClick={() => void loadBackups()} disabled={loading || creating}>
            <AppIcon icon={Refresh03Icon} size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" className={shellButton("secondary")} onClick={() => void createBackup("disk")} disabled={creating}>
            <AppIcon icon={HardDriveIcon} size={14} />
            Disk backup
          </button>
          {r2Connected ? (
            <button type="button" className={shellButton("primary")} onClick={() => void createBackup("disk+r2")} disabled={creating}>
              <AppIcon icon={busy === "disk+r2" ? Refresh03Icon : CloudUploadIcon} size={14} className={busy === "disk+r2" ? "animate-spin" : ""} />
              Disk + R2
            </button>
          ) : (
            <a href="/?settings=storage" className={shellButton("primary")}>
              <AppIcon icon={CloudUploadIcon} size={14} />
              Connect R2
            </a>
          )}
        </div>
      </div>

      {r2Connected ? (
        <div className="flex flex-wrap items-center gap-2 border border-zinc-800 bg-zinc-950/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          <span className="text-[#7fe3dd]">{r2?.bucket}</span>
          <span>{r2?.endpoint}</span>
        </div>
      ) : null}

      {error ? <div className="border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5 font-mono text-[10px] text-rose-300">{error}</div> : null}
      {success ? (
        <div className="flex items-center gap-2 border border-emerald-500/35 bg-emerald-950/30 px-3.5 py-2.5 font-mono text-[10px] text-emerald-300">
          <AppIcon icon={CheckmarkCircle02Icon} size={13} />
          {success}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto border border-zinc-800 bg-zinc-950/45">
        {backups.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center border border-zinc-800 bg-zinc-900 text-zinc-500">
                <AppIcon icon={Archive01Icon} size={20} />
              </div>
              <h4 className="mt-4 font-hero text-lg text-zinc-100">{loading ? "Loading backups" : "No backups yet"}</h4>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Create a disk backup first. R2 upload can be added after the local snapshot completes.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {backups.map((backup) => {
              const deleting = busy === `delete:${backup.id}`;
              return (
                <div key={backup.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${backupStatusClass(backup.status)}`}>
                        {backup.status}
                      </span>
                      <span className="border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        {storageLabel(backup)}
                      </span>
                      <span className="border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        {formatBytes(backup.sizeBytes)}
                      </span>
                    </div>
                    <div className="mt-3 truncate font-mono text-xs text-zinc-100">{backup.fileName ?? backup.id}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      <span>{backup.engine}</span>
                      <span>{backup.format}</span>
                      <span>{formatDate(backup.createdAt)}</span>
                      {backup.r2Key ? <span className="normal-case tracking-normal text-[#7fe3dd]">{backup.r2Key}</span> : null}
                    </div>
                    {backup.error ? <div className="mt-3 text-xs leading-relaxed text-rose-300">{backup.error}</div> : null}
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {backup.status === "succeeded" ? (
                      <a
                        href={api.databaseBackupDownloadUrl(serviceId, backup.id)}
                        className="inline-flex h-9 w-9 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-[#4FB8B2]/45 hover:bg-[#4FB8B2]/10 hover:text-[#7fe3dd]"
                        title="Download backup"
                        aria-label="Download backup"
                      >
                        <AppIcon icon={Download01Icon} size={15} />
                      </a>
                    ) : null}
                    {deleteId === backup.id ? (
                      <div className="flex items-center gap-1 border border-rose-500/35 bg-rose-950/20 p-1">
                        <span className="px-2 text-xs text-rose-100">Delete?</span>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-rose-200 hover:bg-rose-500/10" onClick={() => void deleteBackup(backup.id)} disabled={deleting} title="Yes" aria-label="Yes">
                          <AppIcon icon={deleting ? Refresh03Icon : CheckmarkCircle02Icon} size={15} className={deleting ? "animate-spin" : ""} />
                        </button>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-zinc-300 hover:bg-zinc-800" onClick={() => setDeleteId("")} disabled={deleting} title="No" aria-label="No">
                          <AppIcon icon={Cancel01Icon} size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-rose-500/45 hover:bg-rose-500/10 hover:text-rose-300"
                        onClick={() => setDeleteId(backup.id)}
                        title="Delete backup"
                        aria-label="Delete backup"
                      >
                        <AppIcon icon={Delete02Icon} size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
