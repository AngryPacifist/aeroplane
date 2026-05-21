import {
  AddSquareIcon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Delete02Icon,
  FolderCodeIcon,
  FolderOpenIcon,
  GitBranchIcon,
  GithubIcon,
  Globe02Icon,
  MoreVerticalIcon,
  PackageIcon,
  PencilEdit02Icon,
  Search01Icon,
  Settings01Icon,
  WorkflowSquare07Icon
} from "@hugeicons/core-free-icons";
import { FormEvent, ReactNode, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type GitHubDirectory,
  type GitHubRepo,
  type GitHubStatus,
  type ServiceOverview
} from "../../api";
import { ModalShell } from "./modal-shell";
import {
  AppIcon,
  BrowserIconFallback,
  FieldLabel,
  FormInput,
  FormSelect,
  SectionTitle,
  StatusPill,
  chipClass,
  deploymentCardClass,
  shellButton
} from "../ui/primitives";
import { formatRelativeTime, formatTime, shortSha } from "../../lib/format";
import { githubBranchesCache, githubDirectoriesCache, githubReposCache } from "../../lib/github-cache";
import { DirectoryPickerModal } from "./directory-picker";
import { DirectoryTree } from "./directory-tree";
import { SourcePickerModal } from "./source-picker";
import type { ServiceFormPayload } from "./service-modal-types";

type ParsedEnvEntry = {
  key: string;
  value: string;
};

function parseEnvText(input: string): ParsedEnvEntry[] {
  const byKey = new Map<string, string>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    const value = normalized.slice(separatorIndex + 1).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;

    byKey.set(key, value);
  }

  return Array.from(byKey.entries()).map(([key, value]) => ({ key, value }));
}

export function CreateServiceModal({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: ServiceFormPayload) => Promise<void>;
}) {
  const [step, setStep] = useState<"repo" | "directory" | "configure">("repo");
  const [form, setForm] = useState<ServiceFormPayload>({
    name: "",
    repoFullName: "",
    branch: "main",
    rootDir: undefined,
    internalPort: 8080,
    installCommand: "",
    buildCommand: "",
    startCommand: "",
    staticOutput: ""
  });
  const [connected, setConnected] = useState<null | boolean>(null);
  const [githubStatus, setGitHubStatus] = useState<null | GitHubStatus>(null);
  const [repoQuery, setRepoQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [directoryError, setDirectoryError] = useState("");
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [loadingDirectoryPaths, setLoadingDirectoryPaths] = useState<Set<string>>(new Set());
  const [directoryNodes, setDirectoryNodes] = useState<Record<string, GitHubDirectory[]>>({});
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const [buildOpen, setBuildOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [newEnvOpen, setNewEnvOpen] = useState(false);
  const [envEntries, setEnvEntries] = useState<ParsedEnvEntry[]>([]);
  const [envForm, setEnvForm] = useState<ParsedEnvEntry>({ key: "", value: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const owners = useMemo(() => {
    const values = new Set<string>();
    for (const repo of repos) {
      const owner = repo.fullName.split("/")[0];
      if (owner) values.add(owner);
    }
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [repos]);

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => ownerFilter === "all" || repo.fullName.startsWith(`${ownerFilter}/`));
  }, [ownerFilter, repos]);

  const selectedRepo = useMemo(() => repos.find((repo) => repo.fullName === form.repoFullName) ?? null, [repos, form.repoFullName]);

  useEffect(() => {
    if (!open) {
      setStep("repo");
      setForm({
        name: "",
        repoFullName: "",
        branch: "main",
        rootDir: undefined,
        internalPort: 8080,
        installCommand: "",
        buildCommand: "",
        startCommand: "",
        staticOutput: ""
      });
      setConnected(null);
      setGitHubStatus(null);
      setRepoQuery("");
      setOwnerFilter("all");
      setRepos([]);
      setBranches([]);
      setLoadingRepos(false);
      setLoadingDirectories(false);
      setLoadingDirectoryPaths(new Set());
      setRepoError("");
      setDirectoryError("");
      setDirectoryNodes({});
      setExpandedDirectories(new Set());
      setBuildOpen(false);
      setEnvOpen(false);
      setNewEnvOpen(false);
      setEnvEntries([]);
      setEnvForm({ key: "", value: "" });
      setBusy(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      try {
        const status = await api.githubStatus();
        if (cancelled) return;
        startTransition(() => {
          setGitHubStatus(status);
          setConnected(status.connected);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setGitHubStatus(null);
          setConnected(false);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (connected !== true || !open) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoadingRepos(true);
      void (async () => {
        try {
          const cacheKey = repoQuery.trim().toLowerCase();
          const cachedRepos = githubReposCache.get(cacheKey);
          const repoList = cachedRepos ?? (await api.githubRepos(repoQuery)).repos;
          if (!cachedRepos) {
            githubReposCache.set(cacheKey, repoList);
          }
          if (cancelled) return;
          startTransition(() => {
            setRepos(repoList);
            setRepoError("");
          });
        } catch (issue) {
          if (cancelled) return;
          startTransition(() => {
            setRepos([]);
            setRepoError(issue instanceof Error ? issue.message : "Could not load repositories");
          });
        } finally {
          if (!cancelled) setLoadingRepos(false);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [connected, open, repoQuery]);

  useEffect(() => {
    if (!owners.length) return;
    if (ownerFilter !== "all" && owners.includes(ownerFilter)) return;
    setOwnerFilter(owners[0] ?? "all");
  }, [ownerFilter, owners]);

  useEffect(() => {
    if (!form.repoFullName) return;
    let cancelled = false;

    void (async () => {
      try {
        const cachedBranches = githubBranchesCache.get(form.repoFullName);
        const nextBranches = cachedBranches ?? (await api.githubBranches(form.repoFullName)).branches;
        if (!cachedBranches) {
          githubBranchesCache.set(form.repoFullName, nextBranches);
        }
        if (cancelled) return;
        startTransition(() => {
          setBranches(nextBranches);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setBranches([]);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.repoFullName]);

  useEffect(() => {
    if (!form.repoFullName || !form.branch || step !== "directory") return;
    if (directoryNodes[""]) return;
    void loadDirectoryLevel("");
  }, [directoryNodes, form.branch, form.repoFullName, step]);

  function selectRepo(repo: GitHubRepo) {
    setForm((current) => ({
      ...current,
      name: current.name || repo.name,
      repoFullName: repo.fullName,
      branch: repo.defaultBranch,
      rootDir: undefined
    }));
    setDirectoryNodes({});
    setExpandedDirectories(new Set());
    setDirectoryError("");
    setStep("directory");
  }

  async function loadDirectoryLevel(path: string) {
    if (!form.repoFullName || !form.branch) return;

    const cacheKey = `${form.repoFullName}:${form.branch}:${path}`;
    const cachedDirectories = githubDirectoriesCache.get(cacheKey);
    if (cachedDirectories) {
      startTransition(() => {
        setDirectoryNodes((current) => ({ ...current, [path]: cachedDirectories }));
      });
      return;
    }

    setLoadingDirectories(true);
    setLoadingDirectoryPaths((current) => new Set(current).add(path));
    setDirectoryError("");
    try {
      const nextDirectories = (await api.githubDirectories(form.repoFullName, form.branch, path)).directories;
      githubDirectoriesCache.set(cacheKey, nextDirectories);
      startTransition(() => {
        setDirectoryNodes((current) => ({ ...current, [path]: nextDirectories }));
      });
    } catch (issue) {
      startTransition(() => {
        setDirectoryError(issue instanceof Error ? issue.message : "Could not load directories");
      });
    } finally {
      setLoadingDirectories(false);
      setLoadingDirectoryPaths((current) => {
        const next = new Set(current);
        next.delete(path);
        return next;
      });
    }
  }

  async function toggleDirectory(path: string) {
    const isExpanded = expandedDirectories.has(path);
    if (isExpanded) {
      startTransition(() => {
        setExpandedDirectories((current) => {
          const next = new Set(current);
          next.delete(path);
          return next;
        });
      });
      return;
    }

    await loadDirectoryLevel(path);
    startTransition(() => {
      setExpandedDirectories((current) => new Set(current).add(path));
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({
        ...form,
        rootDir: form.rootDir || undefined,
        installCommand: form.installCommand || undefined,
        buildCommand: form.buildCommand || undefined,
        startCommand: form.startCommand || undefined,
        staticOutput: form.staticOutput || undefined,
        env: envEntries
      });
      onClose();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create service");
    } finally {
      setBusy(false);
    }
  }

  const currentDirectory = form.rootDir || "";
  const stepIndex = step === "repo" ? 0 : step === "directory" ? 1 : 2;
  const stepItems = [
    { key: "repo", label: "Repository" },
    { key: "directory", label: "Directory" },
    { key: "configure", label: "Configure" }
  ] as const;

  function handleEnvPaste(text: string) {
    const entries = parseEnvText(text);
    if (entries.length === 0) return false;

    if (entries.length === 1) {
      setNewEnvOpen(true);
      setEnvForm(entries[0]);
      return true;
    }

    setEnvEntries((current) => {
      const next = new Map(current.map((entry) => [entry.key, entry.value]));
      for (const entry of entries) next.set(entry.key, entry.value);
      return Array.from(next.entries()).map(([key, value]) => ({ key, value }));
    });
    setNewEnvOpen(false);
    setEnvForm({ key: "", value: "" });
    return true;
  }

  function addEnvEntry() {
    if (!envForm.key.trim()) return;
    setEnvEntries((current) => {
      const next = new Map(current.map((entry) => [entry.key, entry.value]));
      next.set(envForm.key.trim(), envForm.value);
      return Array.from(next.entries()).map(([key, value]) => ({ key, value }));
    });
    setEnvForm({ key: "", value: "" });
    setNewEnvOpen(false);
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      icon={step === "repo" ? GithubIcon : step === "directory" ? FolderOpenIcon : Settings01Icon}
      title={step === "repo" ? "Import Git Repository" : step === "directory" ? "Choose Root Directory" : "Configure service"}
      meta={step === "repo" ? "Step 1 of 3" : step === "directory" ? "Step 2 of 3" : "Step 3 of 3"}
      width="max-w-5xl"
      bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
    >
      <div className="mb-5 flex shrink-0 items-center gap-3">
        {stepItems.map((item, index) => (
          <div key={item.key} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 border px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${index === stepIndex ? "border-[#4FB8B2]/40 bg-[#4FB8B2]/14 text-[#7fe3dd]" : index < stepIndex ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-700 bg-zinc-900/85 text-zinc-300"}`}>
              <span className={`grid h-5 w-5 place-items-center border text-[10px] ${index === stepIndex ? "border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]" : "border-zinc-700 text-zinc-400"}`}>{index + 1}</span>
              {item.label}
            </div>
            {index < stepItems.length - 1 ? <div className="h-px w-6 bg-zinc-800" /> : null}
          </div>
        ))}
      </div>
      {step === "repo" ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">
          {connected === false ? (
            <div className="space-y-3 border border-zinc-700 bg-zinc-900/85 p-4">
              <div className="text-sm text-zinc-300">
                {githubStatus?.installUrl ? (
                  <>
                    Install the GitHub App first, or enter <code>owner/repo</code> manually to continue.
                  </>
                ) : (
                  <>
                    GitHub is not connected yet. Configure a GitHub App or set <code>GITHUB_ACCESS_TOKEN</code> on the server.
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <FormInput
                  value={form.repoFullName}
                  onChange={(event) => setForm((current) => ({ ...current, repoFullName: event.target.value, name: event.target.value.split("/").at(-1) || current.name }))}
                  placeholder="owner/repo"
                  disabled={busy}
                />
                <button type="button" className={shellButton("primary")} onClick={() => setStep("directory")} disabled={!form.repoFullName.trim()}>
                  Continue
                </button>
              </div>
            </div>
          ) : connected === null ? (
            <div className="border border-zinc-700 bg-zinc-900/85 px-4 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">Checking GitHub connection…</div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
                <FormSelect value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} disabled={!owners.length}>
                  {owners.length === 0 ? <option value="all">Loading accounts…</option> : null}
                  {owners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </FormSelect>
                <div className="relative">
                  <AppIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-3 top-3 text-zinc-500" />
                  <FormInput value={repoQuery} onChange={(event) => setRepoQuery(event.target.value)} placeholder="Search repositories" className="pl-10" />
                </div>
              </div>

              {repoError ? <div className="border border-rose-500/25 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">GitHub is configured, but repo lookup failed: {repoError}</div> : null}

              <div className="overflow-hidden border border-zinc-700 bg-zinc-900/85">
                <div className="max-h-[460px] overflow-auto">
                  {filteredRepos.length === 0 ? (
                    <div className="px-4 py-5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                      {loadingRepos ? "Loading repositories..." : "No repositories found for this search yet."}
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <div key={repo.id} className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 last:border-b-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center border border-zinc-800 bg-zinc-900 text-zinc-200">
                            <AppIcon icon={GithubIcon} size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-base font-medium text-zinc-100">{repo.name}</div>
                            <div className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                              {repo.fullName}
                              <span className="ml-2">{formatRelativeTime(repo.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <button type="button" className={shellButton("secondary")} onClick={() => selectRepo(repo)}>
                          Import
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      ) : step === "directory" ? (
        <div className="flex min-h-full flex-col">
          <div className="shrink-0 space-y-5">
            <div>
              <FieldLabel>Selected directory</FieldLabel>
              <div className="flex h-11 items-center border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100">
                {currentDirectory ? `./${currentDirectory}` : "./"}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-5">
            <DirectoryTree
              repoLabel={selectedRepo?.name ?? form.repoFullName}
              selectedPath={currentDirectory}
              directoriesByPath={directoryNodes}
              expandedPaths={expandedDirectories}
              loadingPaths={loadingDirectoryPaths}
              errorMessage={directoryError}
              footerMessage={loadingDirectories ? "Loading folders..." : "Choose the folder that contains the app you want to deploy."}
              rootLabel={`${selectedRepo?.name ?? "Repository"} (root)`}
              onToggle={toggleDirectory}
              onSelect={(path) => setForm((current) => ({ ...current, rootDir: path || undefined }))}
            />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <button type="button" className={shellButton("ghost")} onClick={() => setStep("repo")}>
              <AppIcon icon={ArrowLeft01Icon} size={16} />
              Back
            </button>
            <button type="button" className={shellButton("primary")} onClick={() => setStep("configure")}>
              Continue
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-5">
          <div>
            <FieldLabel>Root directory</FieldLabel>
            <div className="flex h-11 items-center border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100">
              {currentDirectory ? `./${currentDirectory}` : "./"}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between border border-zinc-700 bg-zinc-900/90 px-4 py-4 text-left"
              onClick={() => setBuildOpen((current) => !current)}
            >
              <span className="text-base font-medium text-zinc-100">Build and Output Settings</span>
              <AppIcon icon={ArrowLeft01Icon} size={16} className={buildOpen ? "rotate-90" : "-rotate-90"} />
            </button>
            {buildOpen ? (
              <div className="border border-zinc-700 bg-zinc-900 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Service name</FieldLabel>
                    <FormInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="api" required />
                  </div>
                  <div>
                    <FieldLabel>Branch</FieldLabel>
                    <FormSelect value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))}>
                      {branches.length === 0 ? <option value={form.branch || "main"}>{form.branch || "main"}</option> : null}
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div>
                    <FieldLabel>App port</FieldLabel>
                    <FormInput type="number" min={1} max={65535} value={form.internalPort} onChange={(event) => setForm({ ...form, internalPort: Number(event.target.value) })} required />
                  </div>
                  <div>
                    <FieldLabel>Static output</FieldLabel>
                    <FormInput value={form.staticOutput ?? ""} onChange={(event) => setForm({ ...form, staticOutput: event.target.value })} placeholder="auto" />
                  </div>
                  <div>
                    <FieldLabel>Install command</FieldLabel>
                    <FormInput value={form.installCommand ?? ""} onChange={(event) => setForm({ ...form, installCommand: event.target.value })} placeholder="auto" />
                  </div>
                  <div>
                    <FieldLabel>Build command</FieldLabel>
                    <FormInput value={form.buildCommand ?? ""} onChange={(event) => setForm({ ...form, buildCommand: event.target.value })} placeholder="auto" />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Start command</FieldLabel>
                    <FormInput value={form.startCommand ?? ""} onChange={(event) => setForm({ ...form, startCommand: event.target.value })} placeholder="auto" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between border border-zinc-700 bg-zinc-900/90 px-4 py-4 text-left"
              onClick={() => setEnvOpen((current) => !current)}
            >
              <span className="text-base font-medium text-zinc-100">Environment Variables</span>
              <AppIcon icon={ArrowLeft01Icon} size={16} className={envOpen ? "rotate-90" : "-rotate-90"} />
            </button>
            {envOpen ? (
              <div className="space-y-4 border border-zinc-700 bg-zinc-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-zinc-300">These variables will be saved with the service and used on deploy.</div>
                  <button type="button" className={shellButton("secondary")} onClick={() => setNewEnvOpen((current) => !current)}>
                    <AppIcon icon={AddSquareIcon} size={16} />
                    New variable
                  </button>
                </div>

                {newEnvOpen ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                    <div>
                      <FieldLabel>Key</FieldLabel>
                      <FormInput
                        value={envForm.key}
                        onChange={(event) => setEnvForm({ ...envForm, key: event.target.value })}
                        onPaste={(event) => {
                          const text = event.clipboardData.getData("text");
                          if (handleEnvPaste(text)) event.preventDefault();
                        }}
                        placeholder="KEY"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <FieldLabel>Value</FieldLabel>
                      <FormInput
                        value={envForm.value}
                        onChange={(event) => setEnvForm({ ...envForm, value: event.target.value })}
                        onPaste={(event) => {
                          const text = event.clipboardData.getData("text");
                          if (handleEnvPaste(text)) event.preventDefault();
                        }}
                        placeholder="VALUE"
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="button" className={shellButton("primary")} onClick={addEnvEntry}>
                        Save
                      </button>
                      <button
                        type="button"
                        className={shellButton("ghost")}
                        onClick={() => {
                          setNewEnvOpen(false);
                          setEnvForm({ key: "", value: "" });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden border border-zinc-700 bg-zinc-900/88">
                  {envEntries.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-zinc-400">No environment variables yet.</div>
                  ) : (
                    envEntries.map((item) => (
                      <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_180px_56px] items-center gap-4 border-b border-zinc-800 px-5 py-4 last:border-b-0">
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="font-mono text-lg text-zinc-500">{`{ }`}</span>
                          <span className="truncate font-mono text-[15px] uppercase tracking-[0.06em] text-zinc-100">{item.key}</span>
                        </div>
                        <div className="font-mono text-[15px] text-zinc-300">********</div>
                        <button
                          type="button"
                          className="ml-auto inline-flex h-9 w-9 items-center justify-center text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                          onClick={() => setEnvEntries((current) => current.filter((entry) => entry.key !== item.key))}
                        >
                          <AppIcon icon={MoreVerticalIcon} size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-rose-200">{error}</p> : null}
          </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <button type="button" className={shellButton("ghost")} onClick={() => setStep("directory")}>
              <AppIcon icon={ArrowLeft01Icon} size={16} />
              Back
            </button>
            <button type="submit" className={shellButton("primary")} disabled={busy}>
              <AppIcon icon={AddSquareIcon} size={16} />
              {busy ? "Importing..." : "Import service"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
