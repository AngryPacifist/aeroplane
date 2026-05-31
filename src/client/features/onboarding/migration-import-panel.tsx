import { CheckmarkCircle02Icon, CloudUploadIcon, DatabaseExportIcon } from "@hugeicons/core-free-icons";
import { ChangeEvent, FormEvent, useState } from "react";
import { api, type MigrationImportResult } from "../../api";
import { AppIcon, FieldLabel, FormInput, shellButton } from "../../components/ui/primitives";

export function MigrationImportPanel() {
  const [bundle, setBundle] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MigrationImportResult | null>(null);

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
    <section className="border border-[#4FB8B2]/30 bg-[#4FB8B2]/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#4FB8B2]">Migration</div>
          <h2 className="mt-1 font-hero text-lg tracking-tight text-zinc-100">Import an existing Aeroplane</h2>
          <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-zinc-500">
            Restore an encrypted bundle from another VPS before creating a new instance.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]">
          <AppIcon icon={DatabaseExportIcon} size={17} />
        </div>
      </div>

      <form onSubmit={importBundle} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto] md:items-end">
        <div>
          <FieldLabel>Migration bundle</FieldLabel>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300 transition hover:border-[#4FB8B2]/55">
            <AppIcon icon={CloudUploadIcon} size={15} />
            <span className="min-w-0 truncate">{bundle?.name ?? "Choose .aeroplane file"}</span>
            <input type="file" accept=".aeroplane,application/octet-stream" className="sr-only" onChange={chooseBundle} />
          </label>
        </div>
        <div>
          <FieldLabel>Passphrase</FieldLabel>
          <FormInput type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password" />
        </div>
        <button type="submit" className={shellButton("primary")} disabled={importing}>
          <AppIcon icon={importing ? DatabaseExportIcon : CheckmarkCircle02Icon} size={14} className={importing ? "animate-pulse" : ""} />
          {importing ? "Importing" : "Import"}
        </button>
      </form>

      {error ? <div className="mt-4 border border-rose-500/35 bg-rose-950/30 px-4 py-3 font-mono text-xs text-rose-300">{error}</div> : null}
      {result ? (
        <div className="mt-4 border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 font-mono text-xs text-emerald-100">
          Restored {result.projects} projects, {result.services} services, and {result.restoredDatabases} databases.
        </div>
      ) : null}
    </section>
  );
}
