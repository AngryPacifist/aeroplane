import { Alert02Icon, CheckmarkCircle02Icon, DatabaseImportIcon, WorkflowSquare07Icon } from "@hugeicons/core-free-icons";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, type PostgresDataImportResult, type ServiceImportSource } from "../../api";
import { Checkbox } from "../ui/checkbox";
import { AppIcon, FieldLabel, FormInput, shellButton, statusClass } from "../ui/primitives";
import { ModalShell } from "./modal-shell";

type ImportMode = "railway" | "postgres-url";
type ImportPhase = "form" | "progress";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function metadataText(source: ServiceImportSource, key: string) {
  const value = source.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function nextProgressValue(current: number) {
  if (current < 20) return current + 4;
  if (current < 55) return current + 2;
  if (current < 80) return current + 1;
  return current + 0.35;
}

export function PostgresDataImportModal({
  open,
  serviceId,
  onClose,
  onImported
}: {
  open: boolean;
  serviceId: string;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<ImportMode>("railway");
  const [sources, setSources] = useState<ServiceImportSource[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [railwayToken, setRailwayToken] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>("form");
  const [progressPercent, setProgressPercent] = useState(0);
  const [loadingSources, setLoadingSources] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PostgresDataImportResult | null>(null);

  const railwaySource = useMemo(() => sources.find((source) => source.provider === "railway") ?? null, [sources]);
  const railwayProjectName = railwaySource ? metadataText(railwaySource, "projectName") : null;
  const railwayEnvironmentName = railwaySource ? metadataText(railwaySource, "environmentName") : null;

  async function loadSources() {
    setLoadingSources(true);
    try {
      const response = await api.serviceImportSources(serviceId);
      setSources(response.sources);
      setMode(response.sources.some((source) => source.provider === "railway") ? "railway" : "postgres-url");
    } catch {
      setSources([]);
      setMode("postgres-url");
    } finally {
      setLoadingSources(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setError("");
    setResult(null);
    setSourceUrl("");
    setConfirmed(false);
    setPhase("form");
    setProgressPercent(0);
    setRailwayToken(localStorage.getItem("railway_api_token") ?? "");
    void loadSources();
  }, [open, serviceId]);

  useEffect(() => {
    if (phase !== "progress") return;
    if (result) {
      setProgressPercent(100);
      return;
    }
    if (error) {
      setProgressPercent((current) => Math.max(current, 12));
      return;
    }
    if (!busy) return;

    const interval = window.setInterval(() => {
      setProgressPercent((current) => Math.min(94, nextProgressValue(current)));
    }, 550);

    return () => window.clearInterval(interval);
  }, [busy, error, phase, result]);

  function closeModal() {
    if (busy) return;
    setPhase("form");
    setProgressPercent(0);
    onClose();
  }

  async function submitImport(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || busy) return;

    setBusy(true);
    setPhase("progress");
    setProgressPercent(7);
    setError("");
    setResult(null);
    try {
      const response = mode === "railway"
        ? await api.importPostgresDataFromRailway(serviceId, railwayToken.trim())
        : await api.importPostgresDataFromUrl(serviceId, sourceUrl.trim());
      setResult(response.result);
      await onImported();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not import Postgres data");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = confirmed
    && !busy
    && (mode === "railway" ? Boolean(railwaySource && railwayToken.trim()) : Boolean(sourceUrl.trim()));

  if (phase === "progress") {
    const progressIcon = result ? CheckmarkCircle02Icon : error ? Alert02Icon : WorkflowSquare07Icon;
    const progressTitle = result ? "Postgres Data Imported" : error ? "Import Failed" : "Importing Postgres Data";
    const progressStatus = result ? "active" : error ? "failed" : "building";
    const progressLabel = result ? "Complete" : error ? "Failed" : "Running";
    const sourceLabel = mode === "railway" ? railwaySource?.externalServiceName ?? "Railway Postgres" : "Postgres URL";

    return (
      <ModalShell open={open} onClose={closeModal} icon={progressIcon} title={progressTitle} meta="Postgres data import progress." width="max-w-xl">
        <div className="space-y-5">
          <div className="border border-zinc-800 bg-zinc-950/35 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Source</div>
                <div className="mt-1 text-sm text-zinc-100">{sourceLabel}</div>
              </div>
              <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass(progressStatus)}`}>
                {progressLabel}
              </span>
            </div>
            <div className="mt-5 h-2 overflow-hidden border border-zinc-800 bg-zinc-950">
              <div
                className={`h-full transition-[width,background-color] duration-500 ${error ? "bg-rose-400" : "bg-[#4FB8B2]"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {result
                ? "The source dump was restored into this Aeroplane Postgres database."
                : error
                ? "The import stopped before completion. Review the error below, then adjust the source and try again."
                : "Aeroplane is dumping the source database and restoring it into this Postgres service. Large databases can take a few minutes."}
            </p>
          </div>

          {error ? <div className="border border-rose-500/35 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          {result ? (
            <div className="border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
              Imported {formatBytes(result.dumpSizeBytes)} from {result.sourceLabel}
              {result.sourceVariableKey ? ` using ${result.sourceVariableKey}` : ""}.
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-5">
            {error ? (
              <button
                type="button"
                className={shellButton("ghost")}
                onClick={() => {
                  setError("");
                  setProgressPercent(0);
                  setPhase("form");
                }}
              >
                Back
              </button>
            ) : null}
            <button type="button" className={result ? shellButton("primary") : shellButton("secondary")} onClick={closeModal} disabled={busy}>
              {result ? "Done" : "Import in progress"}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell open={open} onClose={closeModal} icon={DatabaseImportIcon} title="Import Postgres Data" meta="Replace this database from another source." width="max-w-2xl">
      <form onSubmit={submitImport} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`border px-4 py-3 text-left transition ${
              mode === "railway"
                ? "border-[#4FB8B2]/45 bg-[#4FB8B2]/10 text-zinc-100"
                : "border-zinc-800 bg-zinc-950/35 text-zinc-300 hover:border-zinc-600"
            } ${!railwaySource && !loadingSources ? "opacity-60" : ""}`}
            onClick={() => setMode("railway")}
            disabled={!railwaySource && !loadingSources}
          >
            <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7fe3dd]">Railway</span>
            <span className="mt-2 block text-sm text-zinc-300">
              {railwaySource ? railwaySource.externalServiceName ?? "Saved Railway service" : loadingSources ? "Checking saved source..." : "No saved Railway source"}
            </span>
          </button>

          <button
            type="button"
            className={`border px-4 py-3 text-left transition ${
              mode === "postgres-url"
                ? "border-[#4FB8B2]/45 bg-[#4FB8B2]/10 text-zinc-100"
                : "border-zinc-800 bg-zinc-950/35 text-zinc-300 hover:border-zinc-600"
            }`}
            onClick={() => setMode("postgres-url")}
          >
            <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7fe3dd]">Postgres URL</span>
            <span className="mt-2 block text-sm text-zinc-300">Use a direct source connection string</span>
          </button>
        </div>

        {mode === "railway" ? (
          <div className="space-y-4 border border-zinc-800 bg-zinc-950/35 p-4">
            {railwaySource ? (
              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Project</div>
                  <div className="mt-1 truncate text-zinc-100">{railwayProjectName ?? railwaySource.externalProjectId ?? "Railway project"}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Environment</div>
                  <div className="mt-1 truncate text-zinc-100">{railwayEnvironmentName ?? railwaySource.externalEnvironmentId ?? "Railway environment"}</div>
                </div>
              </div>
            ) : (
              <div className="border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                This database was not imported from Railway, so there is no saved Railway service ID.
              </div>
            )}

            <div>
              <FieldLabel>Railway API token</FieldLabel>
              <FormInput
                type="password"
                value={railwayToken}
                onChange={(event) => setRailwayToken(event.target.value)}
                disabled={busy || !railwaySource}
                autoComplete="new-password"
                placeholder="rg_pat_..."
              />
            </div>
          </div>
        ) : (
          <div className="border border-zinc-800 bg-zinc-950/35 p-4">
            <FieldLabel>Source Postgres URL</FieldLabel>
            <FormInput
              type="password"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              disabled={busy}
              autoComplete="new-password"
              placeholder="postgresql://user:password@host:5432/database"
            />
          </div>
        )}

        <div className="border border-rose-500/30 bg-rose-950/20 px-4 py-3">
          <Checkbox checked={confirmed} onChange={setConfirmed} disabled={busy} label="Replace existing Postgres data">
            <span className="text-sm text-rose-100">Replace existing data in this Aeroplane Postgres database.</span>
          </Checkbox>
        </div>

        {error ? <div className="border border-rose-500/35 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        {result ? (
          <div className="border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
            Imported {formatBytes(result.dumpSizeBytes)} from {result.sourceLabel}
            {result.sourceVariableKey ? ` using ${result.sourceVariableKey}` : ""}.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-5">
          <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass(busy ? "building" : result ? "active" : "idle")}`}>
            {busy ? "Importing" : result ? "Imported" : "Ready"}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className={shellButton("ghost")} onClick={closeModal} disabled={busy}>
              Close
            </button>
            <button type="submit" className={shellButton("primary")} disabled={!canSubmit}>
              <AppIcon icon={DatabaseImportIcon} size={15} />
              Import data
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
