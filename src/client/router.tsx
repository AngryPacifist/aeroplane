import { HugeiconsIcon } from "@hugeicons/react";
import {
  AddSquareIcon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  CloudServerIcon,
  Delete02Icon,
  FolderCodeIcon,
  FolderOpenIcon,
  GitBranchIcon,
  GithubIcon,
  Globe02Icon,
  PackageIcon,
  Search01Icon,
  Settings01Icon,
  WorkflowSquare07Icon
} from "@hugeicons/core-free-icons";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useParams,
  useSearch
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { FormEvent, ReactNode, startTransition, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  api,
  type DeploymentLog,
  type GitHubDirectory,
  type GitHubRepo,
  type ProjectCard,
  type ProjectDetail,
  type RuntimeLog,
  type ServiceOverview,
  type ToolCheck
} from "./api";

type ModalTab = "deployments" | "logs" | "environment" | "domains" | "settings";
type ServiceFormPayload = {
  name: string;
  repoFullName: string;
  branch: string;
  rootDir?: string;
  internalPort: number;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  staticOutput?: string;
};
const githubReposCache = new Map<string, GitHubRepo[]>();
const githubBranchesCache = new Map<string, string[]>();
const githubDirectoriesCache = new Map<string, GitHubDirectory[]>();

const rootRoute = createRootRoute({
  component: RootShell
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ProjectsPage
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$projectSlug",
  validateSearch: (search): { service?: string; tab?: ModalTab } => {
    const tab = typeof search.tab === "string" && ["deployments", "logs", "environment", "domains", "settings"].includes(search.tab) ? (search.tab as ModalTab) : undefined;
    return {
      service: typeof search.service === "string" ? search.service : undefined,
      tab
    };
  },
  component: ProjectPage
});

const routeTree = rootRoute.addChildren([indexRoute, projectRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function RootShell() {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}

function AppIcon({ icon, className = "", size = 18 }: { icon: unknown; className?: string; size?: number }) {
  return <HugeiconsIcon icon={icon as never} size={size} strokeWidth={1.7} className={className} />;
}

function surfaceClass(extra = "") {
  return `rounded-2xl border border-neutral-200 bg-white shadow-sm ${extra}`.trim();
}

function shellButton(variant: "primary" | "secondary" | "ghost" | "danger" = "secondary") {
  if (variant === "primary") {
    return "inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60";
  }
  if (variant === "danger") {
    return "inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950 disabled:opacity-60";
  }
  if (variant === "ghost") {
    return "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-60";
  }
  return "inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 transition hover:border-neutral-950 disabled:opacity-60";
}

function chipClass(active: boolean) {
  return active
    ? "inline-flex items-center gap-2 rounded-xl border border-neutral-950 bg-neutral-950 px-3 py-2 text-sm font-medium text-white"
    : "inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-950 hover:text-neutral-950";
}

function statusClass(status: string) {
  if (status === "active" || status === "running") return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  if (status === "failed") return "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200";
  if (status === "degraded") return "bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200";
  if (status === "building" || status === "queued") return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  return "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-200";
}

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClass(status)}`}>{status}</span>;
}

function deploymentCardClass(status: string, selected: boolean) {
  if (selected) {
    if (status === "failed") return "border-red-300 bg-red-50 text-red-950";
    if (status === "building" || status === "queued") return "border-amber-300 bg-amber-50 text-amber-950";
    if (status === "active" || status === "running") return "border-emerald-300 bg-emerald-50 text-emerald-950";
    return "border-neutral-950 bg-neutral-950 text-white";
  }

  return "border-neutral-200 bg-neutral-50 hover:border-neutral-950";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{children}</span>;
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 ${props.className ?? ""}`}
    />
  );
}

function FormSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 ${props.className ?? ""}`}
    />
  );
}

function SectionTitle({ icon, title, meta }: { icon: unknown; title: string; meta?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-950 text-white">
        <AppIcon icon={icon} size={18} />
      </div>
      <div>
        <h2 className="text-base font-medium tracking-tight text-neutral-950">{title}</h2>
        {meta ? <p className="text-sm text-neutral-500">{meta}</p> : null}
      </div>
    </div>
  );
}

function formatTime(value: null | string) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortSha(sha: null | string) {
  return sha ? sha.slice(0, 7) : "latest";
}

function RootHeader({
  tools,
  onCreateProject
}: {
  tools: ToolCheck[];
  onCreateProject?: () => void;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-950 text-white">
            <AppIcon icon={WorkflowSquare07Icon} size={18} />
          </div>
          <div>
            <div className="text-base font-medium tracking-tight text-neutral-950">Deploy</div>
            <div className="text-sm text-neutral-500">projects, services, domains</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {tools.slice(0, 4).map((tool) => (
              <div key={tool.name} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                <span className={`h-2 w-2 rounded-full ${tool.ok ? "bg-neutral-950" : "bg-neutral-300"}`} />
                {tool.name}
              </div>
            ))}
          </div>
          {onCreateProject ? (
            <button type="button" className={shellButton("primary")} onClick={onCreateProject}>
              <AppIcon icon={AddSquareIcon} size={16} />
              New project
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <div className={`${surfaceClass("mx-auto max-w-3xl p-10 text-center")}`}>
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-xl bg-neutral-950 text-white">
        <AppIcon icon={FolderOpenIcon} size={24} />
      </div>
      <h2 className="text-2xl font-medium tracking-tight text-neutral-950">No projects yet</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-500">Create a project, then add services inside it. Each service gets its own deploys, logs, variables, and domains.</p>
      <button type="button" className={`${shellButton("primary")} mt-6`} onClick={onCreate}>
        <AppIcon icon={AddSquareIcon} size={16} />
        New project
      </button>
    </div>
  );
}

function ModalShell({
  open,
  title,
  meta,
  icon,
  onClose,
  children,
  width = "max-w-3xl"
}: {
  open: boolean;
  title: string;
  meta?: string;
  icon: unknown;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full items-center justify-center">
        <div className={`${surfaceClass(`flex max-h-[min(720px,calc(100vh-2rem))] min-h-[420px] w-full ${width} flex-col p-6 md:p-7`)}`}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <SectionTitle icon={icon} title={title} meta={meta} />
            <button type="button" className={shellButton("ghost")} onClick={onClose}>
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; description?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({ name: "", description: "" });
      setBusy(false);
      setError("");
    }
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: form.name, description: form.description || undefined });
      onClose();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} icon={FolderCodeIcon} title="New project" meta="Create the project first, then add services inside it.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <FieldLabel>Project name</FieldLabel>
          <FormInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Acme platform" required />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <FormInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Internal tools and APIs" />
        </div>
        {error ? <p className="text-sm text-neutral-500">{error}</p> : null}
        <div className="flex justify-end">
          <button type="submit" className={shellButton("primary")} disabled={busy}>
            <AppIcon icon={AddSquareIcon} size={16} />
            {busy ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function GitHubRepoPicker({
  form,
  setForm,
  disabled = false
}: {
  form: ServiceFormPayload;
  setForm: React.Dispatch<React.SetStateAction<ServiceFormPayload>>;
  disabled?: boolean;
}) {
  const [connected, setConnected] = useState<null | boolean>(null);
  const [repoQuery, setRepoQuery] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [directories, setDirectories] = useState<GitHubDirectory[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [repoError, setRepoError] = useState("");
  const selectedRepo = useMemo(() => repos.find((repo) => repo.fullName === form.repoFullName) ?? null, [repos, form.repoFullName]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const status = await api.githubStatus();
        if (cancelled) return;
        startTransition(() => {
          setConnected(status.connected);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setConnected(false);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (connected !== true) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoadingRepos(true);
      void (async () => {
        try {
          const cachedRepos = githubReposCache.get(repoQuery);
          const repoList = cachedRepos ?? (await api.githubRepos(repoQuery)).repos;
          if (!cachedRepos) {
            githubReposCache.set(repoQuery, repoList);
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
          if (!cancelled) {
            setLoadingRepos(false);
          }
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [connected, repoQuery]);

  useEffect(() => {
    if (!form.repoFullName) return;
    let cancelled = false;

    void (async () => {
      try {
        const cachedBranches = githubBranchesCache.get(form.repoFullName);
        const branches = cachedBranches ?? (await api.githubBranches(form.repoFullName)).branches;
        if (!cachedBranches) {
          githubBranchesCache.set(form.repoFullName, branches);
        }
        if (cancelled) return;
        startTransition(() => {
          setBranches(branches);
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
    if (!form.repoFullName || !form.branch) return;
    let cancelled = false;
    setLoadingDirectories(true);

    void (async () => {
      try {
        const directoryKey = `${form.repoFullName}:${form.branch}`;
        const cachedDirectories = githubDirectoriesCache.get(directoryKey);
        const directories = cachedDirectories ?? (await api.githubDirectories(form.repoFullName, form.branch)).directories;
        if (!cachedDirectories) {
          githubDirectoriesCache.set(directoryKey, directories);
        }
        if (cancelled) return;
        startTransition(() => {
          setDirectories(directories);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setDirectories([]);
        });
      } finally {
        if (!cancelled) {
          setLoadingDirectories(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.repoFullName, form.branch]);

  function selectRepo(repo: GitHubRepo) {
    setForm((current) => ({
      ...current,
      repoFullName: repo.fullName,
      branch: repo.defaultBranch,
      name: current.name || repo.name
    }));
    setRepoQuery(repo.fullName);
  }

  const suggestedDirectories = directories.slice(0, 24);

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>GitHub repository</FieldLabel>
        {connected === false ? (
          <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-sm text-neutral-600">GitHub is not connected yet. Set `GITHUB_ACCESS_TOKEN` on the server to browse repos here. You can still enter `owner/repo` manually below.</div>
            <FormInput
              value={form.repoFullName}
              onChange={(event) => setForm((current) => ({ ...current, repoFullName: event.target.value }))}
              placeholder="owner/repo"
              disabled={disabled}
              required
            />
          </div>
        ) : connected === null ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">Checking GitHub connection…</div>
        ) : (
          <>
            <div className="relative">
              <AppIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-3 top-3 text-neutral-400" />
              <FormInput
                value={repoQuery}
                onChange={(event) => setRepoQuery(event.target.value)}
                placeholder="Search repositories"
                className="pl-10"
                disabled={disabled}
              />
            </div>
            {repoError ? <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">GitHub is configured, but repo lookup failed: {repoError}</div> : null}
            <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50">
              {repos.length === 0 ? (
                <div className="px-3 py-3 text-sm text-neutral-500">{loadingRepos ? "Loading repositories..." : "No repositories found."}</div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    className={`flex w-full items-center justify-between border-b border-neutral-200 px-3 py-2.5 text-left text-sm last:border-b-0 ${form.repoFullName === repo.fullName ? "bg-white text-neutral-950" : "text-neutral-600 hover:bg-white"}`}
                    onClick={() => selectRepo(repo)}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{repo.fullName}</div>
                      <div className="text-xs text-neutral-500">Default branch: {repo.defaultBranch}</div>
                    </div>
                    <span className="rounded-lg bg-neutral-200 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-neutral-600">{repo.private ? "Private" : "Public"}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Branch</FieldLabel>
          <FormSelect value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} disabled={!form.repoFullName || disabled}>
            {branches.length === 0 ? <option value={form.branch || "main"}>{form.branch || "Select a repo first"}</option> : null}
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </FormSelect>
        </div>
        <div>
          <FieldLabel>Directory</FieldLabel>
          <FormSelect value={form.rootDir ?? ""} onChange={(event) => setForm((current) => ({ ...current, rootDir: event.target.value || undefined }))} disabled={!form.repoFullName || disabled}>
            <option value="">Repository root</option>
            {suggestedDirectories
              .filter((directory) => directory.path)
              .map((directory) => (
                <option key={directory.path} value={directory.path}>
                  {directory.path}
                </option>
              ))}
          </FormSelect>
          <p className="mt-1 text-xs text-neutral-500">{loadingDirectories ? "Loading directories..." : "Choose a subdirectory if the app lives below the repo root."}</p>
        </div>
      </div>

      {selectedRepo ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          Connected repo: <span className="font-medium text-neutral-950">{selectedRepo.fullName}</span>
        </div>
      ) : null}
    </div>
  );
}

function CreateServiceModal({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: ServiceFormPayload) => Promise<void>;
}) {
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
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
      setBusy(false);
      setError("");
    }
  }, [open]);

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
        staticOutput: form.staticOutput || undefined
      });
      onClose();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create service");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} icon={CloudServerIcon} title="New service" meta="Choose a GitHub repo, branch, and optional subdirectory.">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <FieldLabel>Service name</FieldLabel>
          <FormInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="api" required />
        </div>

        <GitHubRepoPicker form={form} setForm={setForm} disabled={busy} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>App port</FieldLabel>
            <FormInput type="number" min={1} max={65535} value={form.internalPort} onChange={(event) => setForm({ ...form, internalPort: Number(event.target.value) })} required />
          </div>
          <div>
            <FieldLabel>Static output</FieldLabel>
            <FormInput value={form.staticOutput ?? ""} onChange={(event) => setForm({ ...form, staticOutput: event.target.value })} placeholder="auto" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel>Install command</FieldLabel>
            <FormInput value={form.installCommand ?? ""} onChange={(event) => setForm({ ...form, installCommand: event.target.value })} placeholder="auto" />
          </div>
          <div>
            <FieldLabel>Build command</FieldLabel>
            <FormInput value={form.buildCommand ?? ""} onChange={(event) => setForm({ ...form, buildCommand: event.target.value })} placeholder="auto" />
          </div>
          <div>
            <FieldLabel>Start command</FieldLabel>
            <FormInput value={form.startCommand ?? ""} onChange={(event) => setForm({ ...form, startCommand: event.target.value })} placeholder="auto" />
          </div>
        </div>

        {error ? <p className="text-sm text-neutral-500">{error}</p> : null}
        <div className="flex justify-end">
          <button type="submit" className={shellButton("primary")} disabled={busy}>
            <AppIcon icon={AddSquareIcon} size={16} />
            {busy ? "Adding..." : "Add service"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [tools, setTools] = useState<ToolCheck[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    const [projectData, systemData] = await Promise.all([api.projects(), api.system()]);
    startTransition(() => {
      setProjects(projectData.projects);
      setTools(systemData.tools);
      setError("");
    });
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function createProject(payload: { name: string; description?: string }) {
    const result = await api.createProject(payload);
    await loadProjects();
    void navigate({ to: "/$projectSlug", params: { projectSlug: result.project.slug } });
  }

  return (
    <>
      <RootHeader tools={tools} onCreateProject={() => setCreateOpen(true)} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
        {error ? <div className={`${surfaceClass("p-4")} text-sm text-neutral-500`}>{error}</div> : null}

        {projects.length === 0 ? (
          <EmptyProjects onCreate={() => setCreateOpen(true)} />
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/$projectSlug"
                params={{ projectSlug: project.slug }}
                className={`${surfaceClass("p-5 transition hover:border-neutral-950")}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      <AppIcon icon={FolderCodeIcon} size={14} />
                      {project.serviceCount} service{project.serviceCount === 1 ? "" : "s"}
                    </div>
                    <h2 className="truncate text-xl font-medium tracking-tight text-neutral-950">{project.name}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">{project.description || "Scoped deploy space for related services."}</p>
                  </div>
                  <StatusPill status={project.status} />
                </div>
                <div className="mt-5 space-y-2.5">
                  {project.services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-neutral-950">{service.name}</div>
                        <div className="truncate text-xs text-neutral-500">{service.repoFullName ?? service.repoUrl.replace(/^https?:\/\//, "")}</div>
                      </div>
                      <StatusPill status={service.status} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between text-sm text-neutral-500">
                  <span>Updated {formatTime(project.lastUpdatedAt)}</span>
                  <span className="inline-flex items-center gap-2 text-neutral-900">
                    Open
                    <AppIcon icon={ArrowLeft01Icon} size={16} className="rotate-180" />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createProject} />
    </>
  );
}

function ProjectPage() {
  const navigate = useNavigate();
  const { projectSlug } = useParams({ from: projectRoute.id });
  const search = useSearch({ from: projectRoute.id });
  const [project, setProject] = useState<null | ProjectDetail>(null);
  const [tools, setTools] = useState<ToolCheck[]>([]);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [error, setError] = useState("");

  const loadProject = useCallback(async () => {
    try {
      const projectData = await api.project(projectSlug);
      startTransition(() => {
        setProject(projectData.project);
        setError("");
      });
    } catch (issue) {
      startTransition(() => {
        setError(issue instanceof Error ? issue.message : "Could not load project");
      });
    }
  }, [projectSlug]);

  const loadSystem = useCallback(async () => {
    try {
      const systemData = await api.system();
      startTransition(() => {
        setTools(systemData.tools);
      });
    } catch {
      // Ignore system check failures in the page shell.
    }
  }, []);

  useEffect(() => {
    void loadProject();
  }, [loadProject, projectSlug]);

  useEffect(() => {
    void loadSystem();
  }, [loadSystem]);

  useEffect(() => {
    if (!project?.services.some((service) => service.status === "building")) return;

    const interval = setInterval(() => {
      void loadProject();
    }, 2500);

    return () => clearInterval(interval);
  }, [loadProject, project]);

  const selectedService = project?.services.find((service) => service.id === search.service) ?? null;

  async function createProject(payload: { name: string; description?: string }) {
    const result = await api.createProject(payload);
    void navigate({ to: "/$projectSlug", params: { projectSlug: result.project.slug } });
  }

  async function createService(payload: ServiceFormPayload) {
    if (!project) return;
    const result = await api.createService(project.id, payload);
    await loadProject();
    void navigate({
      to: "/$projectSlug",
      params: { projectSlug },
      search: { service: result.service.id, tab: "deployments" }
    });
  }

  async function deleteProject() {
    if (!project || !window.confirm(`Delete project "${project.name}" and all its services?`)) return;
    await api.deleteProject(project.id);
    void navigate({ to: "/" });
  }

  return (
    <>
      <RootHeader tools={tools} onCreateProject={() => setCreateProjectOpen(true)} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link to="/" className="mb-3 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950">
              <AppIcon icon={ArrowLeft01Icon} size={16} />
              All projects
            </Link>
            <h1 className="text-3xl font-medium tracking-tight text-neutral-950">{project?.name ?? projectSlug}</h1>
            <p className="mt-2 text-sm text-neutral-500">{project?.description || "Services scoped inside this project."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={shellButton("secondary")} onClick={() => setCreateServiceOpen(true)}>
              <AppIcon icon={AddSquareIcon} size={16} />
              New service
            </button>
            <button type="button" className={shellButton("danger")} onClick={() => void deleteProject()} disabled={!project}>
              <AppIcon icon={Delete02Icon} size={16} />
              Delete project
            </button>
          </div>
        </div>

        {error ? <div className={`${surfaceClass("p-4")} text-sm text-neutral-500`}>{error}</div> : null}

        {!project || project.services.length === 0 ? (
          <div className={`${surfaceClass("p-10 text-center")}`}>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-neutral-950 text-white">
              <AppIcon icon={CloudServerIcon} size={20} />
            </div>
            <h2 className="text-xl font-medium tracking-tight">No services yet</h2>
            <p className="mt-2 text-sm text-neutral-500">Add a service and choose the GitHub repo, branch, and directory you want to deploy.</p>
            <button type="button" className={`${shellButton("primary")} mt-5`} onClick={() => setCreateServiceOpen(true)}>
              <AppIcon icon={AddSquareIcon} size={16} />
              Add service
            </button>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {project.services.map((service) => (
              <button
                key={service.id}
                type="button"
                className={`${surfaceClass("p-5 text-left transition hover:border-neutral-950")}`}
                onClick={() =>
                  void navigate({
                    to: "/$projectSlug",
                    params: { projectSlug },
                    search: { service: service.id, tab: "deployments" }
                  })
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      <AppIcon icon={PackageIcon} size={14} />
                      Service
                    </div>
                    <h2 className="truncate text-xl font-medium tracking-tight text-neutral-950">{service.name}</h2>
                    <p className="mt-2 truncate text-sm text-neutral-500">{service.repoFullName ?? service.repoUrl.replace(/^https?:\/\//, "")}</p>
                  </div>
                  <StatusPill status={service.status} />
                </div>
                <div className="mt-5 grid gap-2.5">
                  <InfoRow icon={GitBranchIcon} label={service.branch} />
                  <InfoRow icon={FolderOpenIcon} label={service.rootDir || "Repository root"} />
                  <InfoRow icon={BrowserIconFallback} label={`127.0.0.1:${service.hostPort}`} />
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} onCreate={createProject} />
      <CreateServiceModal open={createServiceOpen} onClose={() => setCreateServiceOpen(false)} onCreate={createService} />
      {selectedService ? (
        <ServiceModal
          key={selectedService.id}
          projectSlug={projectSlug}
          selectedTab={search.tab ?? "deployments"}
          serviceId={selectedService.id}
          onClose={() => void navigate({ to: "/$projectSlug", params: { projectSlug }, search: {} })}
          onTabChange={(tab) => void navigate({ to: "/$projectSlug", params: { projectSlug }, search: { service: selectedService.id, tab } })}
          onProjectRefresh={loadProject}
          onDeleted={() => void navigate({ to: "/$projectSlug", params: { projectSlug }, search: {} })}
        />
      ) : null}
    </>
  );
}

function BrowserIconFallback({ className = "", size = 17 }: { className?: string; size?: number }) {
  return <AppIcon icon={Globe02Icon} size={size} className={className} />;
}

function InfoRow({ icon, label }: { icon: unknown | ((props: { className?: string; size?: number }) => ReactNode); label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
      {typeof icon === "function" ? icon({ size: 17 }) : <AppIcon icon={icon} size={17} />}
      <span className="truncate">{label}</span>
    </div>
  );
}

function LogsPanel({ logs, emptyLabel, title }: { logs: DeploymentLog[]; emptyLabel: string; title: string }) {
  const ref = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-4 text-neutral-100">
      <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-neutral-400">
        <AppIcon icon={WorkflowSquare07Icon} size={16} />
        {title}
      </div>
      <pre ref={ref} className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-neutral-200">
        {logs.length > 0 ? logs.map((log) => `[${new Date(log.createdAt).toLocaleTimeString()}] ${log.line}`).join("\n") : emptyLabel}
      </pre>
    </div>
  );
}

function RuntimeLogsPanel({ logs, emptyLabel, title }: { logs: RuntimeLog[]; emptyLabel: string; title: string }) {
  const ref = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-4 text-neutral-100">
      <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-neutral-400">
        <AppIcon icon={WorkflowSquare07Icon} size={16} />
        {title}
      </div>
      <pre ref={ref} className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-neutral-200">
        {logs.length > 0 ? logs.map((log) => `[${new Date(log.createdAt).toLocaleTimeString()}] ${log.line}`).join("\n") : emptyLabel}
      </pre>
    </div>
  );
}

function ServiceModal({
  projectSlug,
  selectedTab,
  serviceId,
  onClose,
  onTabChange,
  onProjectRefresh,
  onDeleted
}: {
  projectSlug: string;
  selectedTab: ModalTab;
  serviceId: string;
  onClose: () => void;
  onTabChange: (tab: ModalTab) => void;
  onProjectRefresh: () => Promise<void> | void;
  onDeleted: () => void;
}) {
  const [overview, setOverview] = useState<null | ServiceOverview>(null);
  const [activeDeploymentId, setActiveDeploymentId] = useState<null | string>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLog[]>([]);
  const [envForm, setEnvForm] = useState({ key: "", value: "" });
  const [domainForm, setDomainForm] = useState({ hostname: "" });
  const [settings, setSettings] = useState({
    name: "",
    repoFullName: "",
    branch: "",
    rootDir: "",
    installCommand: "",
    buildCommand: "",
    startCommand: "",
    staticOutput: "",
    internalPort: 8080
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const result = await api.serviceOverview(serviceId);
      startTransition(() => {
        setOverview(result);
        setActiveDeploymentId((current) => current ?? result.deployments[0]?.id ?? null);
        setSettings({
          name: result.service.name,
          repoFullName: result.service.repoFullName ?? "",
          branch: result.service.branch,
          rootDir: result.service.rootDir ?? "",
          installCommand: result.service.installCommand ?? "",
          buildCommand: result.service.buildCommand ?? "",
          startCommand: result.service.startCommand ?? "",
          staticOutput: result.service.staticOutput ?? "",
          internalPort: result.service.internalPort
        });
        setError("");
      });
    } catch (issue) {
      startTransition(() => {
        setError(issue instanceof Error ? issue.message : "Could not load service");
      });
    }
  }, [serviceId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview, serviceId]);

  useEffect(() => {
    const hasActiveDeployment = overview?.deployments.some((deployment) => deployment.status === "queued" || deployment.status === "building");
    if (!hasActiveDeployment && overview?.service.status !== "building") return;

    const interval = setInterval(() => {
      void loadOverview();
      void onProjectRefresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [loadOverview, onProjectRefresh, overview]);

  useEffect(() => {
    if (!activeDeploymentId) {
      setDeploymentLogs([]);
      return;
    }

    const events = new EventSource(`/api/deployments/${activeDeploymentId}/stream`);
    events.addEventListener("snapshot", (event) => {
      startTransition(() => setDeploymentLogs(JSON.parse((event as MessageEvent).data)));
    });
    events.addEventListener("log", (event) => {
      const log = JSON.parse((event as MessageEvent).data) as DeploymentLog;
      startTransition(() => setDeploymentLogs((current) => [...current, log]));
    });
    events.onerror = () => events.close();
    return () => events.close();
  }, [activeDeploymentId]);

  useEffect(() => {
    if (selectedTab !== "logs") return;

    const events = new EventSource(`/api/services/${serviceId}/runtime-logs/stream`);
    events.addEventListener("snapshot", (event) => {
      startTransition(() => setRuntimeLogs(JSON.parse((event as MessageEvent).data)));
    });
    events.addEventListener("log", (event) => {
      const log = JSON.parse((event as MessageEvent).data) as RuntimeLog;
      startTransition(() => setRuntimeLogs((current) => [...current, log]));
    });
    events.onerror = () => events.close();
    return () => events.close();
  }, [selectedTab, serviceId]);

  async function doAction(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await action();
      await loadOverview();
      await onProjectRefresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await doAction("settings", async () => {
      await api.updateService(serviceId, {
        name: settings.name,
        repoFullName: settings.repoFullName,
        branch: settings.branch,
        rootDir: settings.rootDir || undefined,
        installCommand: settings.installCommand || undefined,
        buildCommand: settings.buildCommand || undefined,
        startCommand: settings.startCommand || undefined,
        staticOutput: settings.staticOutput || undefined,
        internalPort: Number(settings.internalPort)
      });
    });
  }

  async function deleteService() {
    if (!overview?.service || !window.confirm(`Delete service "${overview.service.name}"?`)) return;
    setBusy("delete");
    try {
      await api.deleteService(serviceId);
      await onProjectRefresh();
      onDeleted();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not delete service");
    } finally {
      setBusy("");
    }
  }

  const service = overview?.service;
  const deployments = overview?.deployments ?? [];
  const env = overview?.env ?? [];
  const domains = overview?.domains ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className={`${surfaceClass("flex h-[min(860px,calc(100vh-2rem))] min-h-[680px] w-full flex-col p-6 md:p-7")}`}>
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-950 text-white">
                  <AppIcon icon={CloudServerIcon} size={20} />
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    <AppIcon icon={FolderCodeIcon} size={14} />
                    {projectSlug}
                  </div>
                  <h2 className="text-2xl font-medium tracking-tight text-neutral-950">{service?.name ?? "Service"}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                    <span>{service?.repoFullName ?? service?.repoUrl}</span>
                    {service ? <StatusPill status={service.status} /> : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={shellButton("secondary")} onClick={() => void doAction("deploy", async () => void api.createDeployment(serviceId))} disabled={busy === "deploy"}>
                  <AppIcon icon={WorkflowSquare07Icon} size={16} />
                  Deploy
                </button>
                <button type="button" className={shellButton("ghost")} onClick={onClose}>
                  Close
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ["deployments", PackageIcon],
                ["logs", WorkflowSquare07Icon],
                ["environment", Settings01Icon],
                ["domains", Globe02Icon],
                ["settings", GithubIcon]
              ] as Array<[ModalTab, unknown]>).map(([tab, icon]) => (
                <button key={tab} type="button" className={chipClass(selectedTab === tab)} onClick={() => onTabChange(tab)}>
                  <AppIcon icon={icon} size={15} />
                  <span className="capitalize">{tab}</span>
                </button>
              ))}
            </div>

            {error ? <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">{error}</div> : null}

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {selectedTab === "deployments" ? (
                <div className="grid min-h-full gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="space-y-3">
                  {deployments.map((deployment) => (
                    <button
                      key={deployment.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${deploymentCardClass(
                        deployment.status,
                        deployment.id === activeDeploymentId
                      )}`}
                      onClick={() => {
                        setActiveDeploymentId(deployment.id);
                        onTabChange("logs");
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium">{shortSha(deployment.commitSha)}</div>
                        <div
                          className={`mt-1 text-xs ${
                            deployment.id === activeDeploymentId
                              ? deployment.status === "failed"
                                ? "text-red-700"
                                : deployment.status === "building" || deployment.status === "queued"
                                  ? "text-amber-700"
                                  : deployment.status === "active" || deployment.status === "running"
                                    ? "text-emerald-700"
                                    : "text-neutral-300"
                              : "text-neutral-500"
                          }`}
                        >
                          {formatTime(deployment.createdAt)}
                        </div>
                      </div>
                      <StatusPill status={deployment.status} />
                    </button>
                  ))}
                </div>
                <LogsPanel logs={deploymentLogs} title="Deploy output" emptyLabel="Choose a deployment to inspect its build and deploy logs." />
                </div>
              ) : null}

              {selectedTab === "logs" ? <RuntimeLogsPanel logs={runtimeLogs} title="Live service logs" emptyLabel="No runtime logs yet." /> : null}

              {selectedTab === "environment" ? (
                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <form
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void doAction("env", async () => {
                      await api.upsertEnv(serviceId, envForm);
                      startTransition(() => setEnvForm({ key: "", value: "" }));
                    });
                  }}
                >
                  <SectionTitle icon={Settings01Icon} title="Environment variables" meta="Per-service secrets and config." />
                  <div className="mt-5 space-y-4">
                    <div>
                      <FieldLabel>Key</FieldLabel>
                      <FormInput value={envForm.key} onChange={(event) => setEnvForm({ ...envForm, key: event.target.value })} placeholder="DATABASE_URL" required />
                    </div>
                    <div>
                      <FieldLabel>Value</FieldLabel>
                      <FormInput type="password" value={envForm.value} onChange={(event) => setEnvForm({ ...envForm, value: event.target.value })} placeholder="postgres://..." required />
                    </div>
                    <button type="submit" className={`${shellButton("primary")} w-full`} disabled={busy === "env"}>
                      <AppIcon icon={CheckmarkCircle02Icon} size={16} />
                      Save variable
                    </button>
                  </div>
                </form>
                <div className="space-y-3">
                  {env.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-neutral-950">{item.key}</div>
                        <div className="mt-1 text-sm text-neutral-500">Updated {formatTime(item.updatedAt)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-neutral-100 px-3 py-1 text-sm text-neutral-600">••••••</span>
                        <button type="button" className={shellButton("ghost")} onClick={() => void doAction("env", async () => void api.deleteEnv(serviceId, item.id))}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              ) : null}

              {selectedTab === "domains" ? (
                <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <form
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void doAction("domain", async () => {
                      await api.addDomain(serviceId, domainForm);
                      startTransition(() => setDomainForm({ hostname: "" }));
                    });
                  }}
                >
                  <SectionTitle icon={Globe02Icon} title="Domains" meta="Local `.localhost` names or public hostnames." />
                  <div className="mt-5 space-y-4">
                    <div>
                      <FieldLabel>Hostname</FieldLabel>
                      <FormInput value={domainForm.hostname} onChange={(event) => setDomainForm({ hostname: event.target.value })} placeholder={`${service?.slug ?? "service"}.localhost`} required />
                    </div>
                    <button type="submit" className={`${shellButton("primary")} w-full`} disabled={busy === "domain"}>
                      <AppIcon icon={AddSquareIcon} size={16} />
                      Add domain
                    </button>
                  </div>
                </form>
                <div className="space-y-3">
                  {domains.map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-4">
                      <div>
                        <div className="font-medium text-neutral-950">{domain.hostname}</div>
                        <div className="text-sm text-neutral-500">{domain.hostname.endsWith(".localhost") ? "Local route through Caddy" : "Public hostname"}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={domain.status} />
                        <button type="button" className={shellButton("ghost")} onClick={() => void doAction("domain", async () => void api.deleteDomain(serviceId, domain.id))}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              ) : null}

              {selectedTab === "settings" ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <form onSubmit={saveSettings} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                  <SectionTitle icon={GithubIcon} title="Service settings" meta="Repo, branch, directory, commands, and runtime." />
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Service name</FieldLabel>
                      <FormInput value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} />
                    </div>
                    <div>
                      <FieldLabel>App port</FieldLabel>
                      <FormInput type="number" value={settings.internalPort} onChange={(event) => setSettings({ ...settings, internalPort: Number(event.target.value) })} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Repository</FieldLabel>
                      <FormInput value={settings.repoFullName} onChange={(event) => setSettings({ ...settings, repoFullName: event.target.value })} placeholder="owner/repo" />
                    </div>
                    <div>
                      <FieldLabel>Branch</FieldLabel>
                      <FormInput value={settings.branch} onChange={(event) => setSettings({ ...settings, branch: event.target.value })} />
                    </div>
                    <div>
                      <FieldLabel>Directory</FieldLabel>
                      <FormInput value={settings.rootDir} onChange={(event) => setSettings({ ...settings, rootDir: event.target.value })} placeholder="apps/web" />
                    </div>
                    <div>
                      <FieldLabel>Install command</FieldLabel>
                      <FormInput value={settings.installCommand} onChange={(event) => setSettings({ ...settings, installCommand: event.target.value })} placeholder="auto" />
                    </div>
                    <div>
                      <FieldLabel>Build command</FieldLabel>
                      <FormInput value={settings.buildCommand} onChange={(event) => setSettings({ ...settings, buildCommand: event.target.value })} placeholder="auto" />
                    </div>
                    <div>
                      <FieldLabel>Start command</FieldLabel>
                      <FormInput value={settings.startCommand} onChange={(event) => setSettings({ ...settings, startCommand: event.target.value })} placeholder="auto" />
                    </div>
                    <div>
                      <FieldLabel>Static output</FieldLabel>
                      <FormInput value={settings.staticOutput} onChange={(event) => setSettings({ ...settings, staticOutput: event.target.value })} placeholder="auto" />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button type="submit" className={shellButton("primary")} disabled={busy === "settings"}>
                      <AppIcon icon={CheckmarkCircle02Icon} size={16} />
                      Save settings
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <SectionTitle icon={GithubIcon} title="GitHub deploy target" meta="This service redeploys from the selected branch and directory." />
                    <div className="mt-5 space-y-3">
                      <InfoRow icon={GithubIcon} label={service?.repoFullName ?? service?.repoUrl ?? "No repo"} />
                      <InfoRow icon={GitBranchIcon} label={service?.branch ?? "main"} />
                      <InfoRow icon={FolderOpenIcon} label={service?.rootDir || "Repository root"} />
                      <InfoRow icon={Globe02Icon} label={`127.0.0.1:${service?.hostPort ?? "..."}`} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <SectionTitle icon={Delete02Icon} title="Danger zone" meta="Delete this service and its deployment history." />
                    <div className="mt-5">
                      <button type="button" className={shellButton("danger")} onClick={() => void deleteService()} disabled={busy === "delete"}>
                        <AppIcon icon={Delete02Icon} size={16} />
                        Delete service
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
