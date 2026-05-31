import { CheckmarkCircle02Icon, CloudUploadIcon, DatabaseExportIcon } from "@hugeicons/core-free-icons";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api, type MigrationImportResult } from "../../api";
import { ModalShell } from "../../components/modals/modal-shell";
import { AppIcon, FieldLabel, FormInput, shellButton } from "../../components/ui/primitives";

export function MigrationImportModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [bundle, setBundle] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MigrationImportResult | null>(null);

  useEffect(() => {
    if (open) return;
    setBundle(null);
    setPassphrase("");
    setImporting(false);
    setError("");
    setResult(null);
  }, [open]);

  function chooseBundle(event: ChangeEvent<HTMLInputElement>) {
    setBundle(event.target.files?.[0] ?? null);
    setResult(null);
    setError("");
  }

  async function importBundle(event: FormEvent) {
    event.preventDefault();
    if (!bundle) {
      setError("Choose a migration bundle.");
      return;
    }
    if (passphrase.length < 8) {
      setError("Enter the migration passphrase.");
      return;
    }

    setImporting(true);
    setError("");
    setResult(null);
    try {
      const response = await api.importMigrationBundle(bundle, passphrase);
      setResult(response.result);
      window.location.replace("/onboarding/success");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not import migration bundle");
      setImporting(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} icon={DatabaseExportIcon} title="Import Aeroplane" meta="Restore an encrypted bundle from another VPS." width="max-w-3xl">
      <form onSubmit={importBundle} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
          <div>
            <FieldLabel>Migration bundle</FieldLabel>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300 transition hover:border-[#4FB8B2]/55">
              <AppIcon icon={CloudUploadIcon} size={15} />
              <span className="min-w-0 truncate">{bundle?.name ?? "Choose .aeroplane file"}</span>
              <input type="file" accept=".aeroplane,application/octet-stream" className="sr-only" onChange={chooseBundle} />
            </label>
          </div>
          <div>
            <FieldLabel>Passphrase</FieldLabel>
            <FormInput type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password" />
          </div>
        </div>

        {error ? <div className="border border-rose-500/35 bg-rose-950/30 px-4 py-3 font-mono text-xs text-rose-300">{error}</div> : null}
        {result ? (
          <div className="border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 font-mono text-xs text-emerald-100">
            Restored {result.projects} projects, {result.services} services, and {result.restoredDatabases} databases.
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-5">
          <button type="button" className={shellButton("ghost")} onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button type="submit" className={shellButton("primary")} disabled={importing}>
            <AppIcon icon={importing ? DatabaseExportIcon : CheckmarkCircle02Icon} size={14} className={importing ? "animate-pulse" : ""} />
            {importing ? "Importing" : "Import"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
