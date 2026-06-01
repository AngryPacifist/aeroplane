import {
  CheckmarkCircle02Icon,
  DatabaseBackup,
  Refresh03Icon,
  Settings01Icon
} from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useState } from "react";
import { api, type BackupStorageTarget, type DatabaseBackup as DatabaseBackupRecord, type DatabaseBackupSettings, type R2SettingsStatus } from "../../api";
import { AppIcon, shellButton } from "../ui/primitives";
import { defaultSettings, storageLabel } from "./database-backups/backup-format";
import { BackupList } from "./database-backups/backup-list";
import { BackupSettingsModal } from "./database-backups/backup-settings-modal";

export function DatabaseBackupsPanel({ serviceId }: { serviceId: string }) {
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>([]);
  const [settings, setSettings] = useState<DatabaseBackupSettings | null>(null);
  const [r2, setR2] = useState<R2SettingsStatus | null>(null);
  const [busy, setBusy] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [restoreId, setRestoreId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftStorage, setDraftStorage] = useState<BackupStorageTarget>("disk");
  const [draftAutomatic, setDraftAutomatic] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const r2Connected = r2?.connected ?? false;
  const activeSettings = settings ?? defaultSettings(r2Connected);

  const loadBackups = useCallback(async () => {
    setBusy((current) => current || "load");
    setError("");
    try {
      const result = await api.databaseBackups(serviceId);
      setBackups(result.backups);
      setSettings(result.settings);
      setDraftStorage(result.settings.storage);
      setDraftAutomatic(result.settings.automaticEnabled);
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

  async function createBackup() {
    setBusy("backup");
    setError("");
    setSuccess("");
    try {
      const result = await api.createDatabaseBackup(serviceId);
      setBackups((current) => [result.backup, ...current.filter((backup) => backup.id !== result.backup.id)]);
      setSuccess(`Backup saved to ${storageLabel(result.backup.storage, Boolean(result.backup.r2Key))}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create backup");
      await loadBackups();
    } finally {
      setBusy("");
    }
  }

  async function saveSettings() {
    setBusy("settings");
    setError("");
    setSuccess("");
    try {
      const result = await api.updateDatabaseBackupSettings(serviceId, {
        storage: draftStorage,
        automaticEnabled: draftAutomatic
      });
      setSettings(result.settings);
      setSettingsOpen(false);
      setSuccess("Backup settings saved.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not save backup settings");
    } finally {
      setBusy("");
    }
  }

  async function restoreBackup(backupId: string) {
    setBusy(`restore:${backupId}`);
    setError("");
    setSuccess("");
    try {
      await api.restoreDatabaseBackup(serviceId, backupId);
      setRestoreId("");
      setSuccess("Backup restored.");
      await loadBackups();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not restore backup");
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

  function openSettings() {
    setDraftStorage(activeSettings.storage);
    setDraftAutomatic(activeSettings.automaticEnabled);
    setSettingsOpen(true);
  }

  const loading = busy === "load";
  const creating = busy === "backup";
  const savingSettings = busy === "settings";

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-hero text-xl text-zinc-100">Backups</h3>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {storageLabel(activeSettings.storage, r2Connected)} by default
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={shellButton("ghost")} onClick={() => void loadBackups()} disabled={loading || creating} title="Refresh backups" aria-label="Refresh backups">
              <AppIcon icon={Refresh03Icon} size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button type="button" className={shellButton("primary")} onClick={() => void createBackup()} disabled={creating || loading}>
              <AppIcon icon={creating ? Refresh03Icon : DatabaseBackup} size={14} className={creating ? "animate-spin" : ""} />
              Backup
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
              onClick={openSettings}
              title="Backup settings"
              aria-label="Backup settings"
            >
              <AppIcon icon={Settings01Icon} size={16} />
            </button>
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

        <BackupList
          serviceId={serviceId}
          backups={backups}
          loading={loading}
          busy={busy}
          deleteId={deleteId}
          restoreId={restoreId}
          onDeletePrompt={setDeleteId}
          onRestorePrompt={setRestoreId}
          onDelete={(backupId) => void deleteBackup(backupId)}
          onRestore={(backupId) => void restoreBackup(backupId)}
        />
      </div>

      <BackupSettingsModal
        open={settingsOpen}
        activeSettings={activeSettings}
        r2Connected={r2Connected}
        draftStorage={draftStorage}
        draftAutomatic={draftAutomatic}
        saving={savingSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={() => void saveSettings()}
        onDraftStorageChange={setDraftStorage}
        onDraftAutomaticChange={setDraftAutomatic}
      />
    </>
  );
}
