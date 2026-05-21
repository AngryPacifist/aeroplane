import { Link, useNavigate } from "@tanstack/react-router";
import {
  AddSquareIcon,
  ArrowLeft01Icon,
  CloudServerIcon,
  Delete02Icon,
  FolderCodeIcon,
  FolderOpenIcon,
  GitBranchIcon,
  PackageIcon,
  WorkflowSquare07Icon
} from "@hugeicons/core-free-icons";
import { startTransition, useCallback, useEffect, useState } from "react";
import { api, type ProjectDetail, type ToolCheck } from "../api";
import { AppIcon, BrowserIconFallback, InfoRow } from "../components/ui/primitives";
import { CreateProjectModal } from "../features/projects/create-project-modal";
import { CreateServiceModal } from "../components/modals/create-service-modal";
import { ServiceModal } from "../components/modals/service-modal";
import type { ModalTab, ServiceFormPayload } from "../components/modals/service-modal-types";

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active" || status === "running"
      ? "border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#4FB8B2]"
      : status === "building" || status === "queued"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : status === "failed"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
          : "border-zinc-700 bg-zinc-900/50 text-zinc-400";

  return <span className={`inline-flex border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] ${tone}`}>{status}</span>;
}

export function ProjectPage({
  projectSlug,
  selectedServiceId,
  selectedTab = "deployments"
}: {
  projectSlug: string;
  selectedServiceId?: string;
  selectedTab?: ModalTab;
}) {
  const navigate = useNavigate();
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
      // Ignore system shell issues.
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

  const selectedService = project?.services.find((service) => service.id === selectedServiceId) ?? null;

  async function createProject(payload: { name: string; description?: string }) {
    const result = await api.createProject(payload);
    void navigate({ to: "/$projectSlug", params: { projectSlug: result.project.slug } });
  }

  async function createService(payload: ServiceFormPayload) {
    if (!project) return;
    const result = await api.createService(project.id, payload);
    await loadProject();
    void navigate({ to: "/$projectSlug", params: { projectSlug }, search: { service: result.service.id, tab: "deployments" } });
  }

  async function deleteProject() {
    if (!project || !window.confirm(`Delete project "${project.name}" and all its services?`)) return;
    await api.deleteProject(project.id);
    void navigate({ to: "/" });
  }

  return (
    <>
      <main className="relative isolate min-h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
        <div aria-hidden className="hero-noise pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_0%_0%,rgba(79,184,178,0.12),transparent),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(120,113,255,0.08),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pb-24 pt-14 sm:px-6 lg:pl-14 lg:pr-10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/90 pb-5 font-mono text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#4FB8B2]">
                <AppIcon icon={WorkflowSquare07Icon} size={18} />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">Deploy registry</div>
                <div className="font-hero text-lg tracking-tight text-zinc-100">{project?.name ?? projectSlug}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 lg:flex">
                {tools.slice(0, 4).map((tool) => (
                  <div key={tool.name} className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${tool.ok ? "bg-[#4FB8B2]" : "bg-zinc-700"}`} />
                    {tool.name}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 border border-[#4FB8B2]/50 bg-[#4FB8B2]/15 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4FB8B2] transition-colors hover:bg-[#4FB8B2]/25"
                onClick={() => setCreateServiceOpen(true)}
              >
                <AppIcon icon={AddSquareIcon} size={16} />
                New service
              </button>
            </div>
          </header>

          <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 transition hover:text-[#4FB8B2]">
                <AppIcon icon={ArrowLeft01Icon} size={16} />
                All projects
              </Link>
              <h1 className="mt-5 font-hero text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">{project?.name ?? projectSlug}</h1>
              <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-zinc-500">{project?.description || "Services scoped inside this project."}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 border border-zinc-700 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:border-[#4FB8B2]/55 hover:bg-[#4FB8B2]/10 hover:text-[#4FB8B2]"
                onClick={() => setCreateProjectOpen(true)}
              >
                <AppIcon icon={FolderCodeIcon} size={16} />
                New project
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 border border-zinc-700 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                onClick={() => void deleteProject()}
                disabled={!project}
              >
                <AppIcon icon={Delete02Icon} size={16} />
                Delete project
              </button>
            </div>
          </section>

          {error ? <div className="border border-rose-500/35 bg-rose-950/30 px-4 py-3 font-mono text-xs text-rose-300">{error}</div> : null}

          {!project || project.services.length === 0 ? (
            <section className="border border-zinc-800 bg-zinc-950/60 px-6 py-10 sm:px-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  <AppIcon icon={CloudServerIcon} size={14} />
                  Empty project
                </div>
                <h2 className="mt-6 font-hero text-3xl font-extrabold tracking-tight text-zinc-100">No services yet</h2>
                <p className="mt-3 max-w-lg font-mono text-sm leading-relaxed text-zinc-500">
                  Add a service and wire up the repo, branch, directory, deploy history, and runtime surface from here.
                </p>
                <button
                  type="button"
                  className="mt-8 inline-flex items-center justify-center gap-2 border border-[#4FB8B2]/50 bg-[#4FB8B2]/15 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4FB8B2] transition-colors hover:bg-[#4FB8B2]/25"
                  onClick={() => setCreateServiceOpen(true)}
                >
                  <AppIcon icon={AddSquareIcon} size={16} />
                  Add service
                </button>
              </div>
            </section>
          ) : (
            <section className="grid gap-5 xl:grid-cols-2">
              {project.services.map((service) => {
                const visibleUrl = service.primaryUrl || service.localUrl;
                const visibleLabel = visibleUrl.replace(/^https?:\/\//, "");

                return (
                  <button
                    key={service.id}
                    type="button"
                    className="group border border-zinc-800 bg-zinc-950/60 p-6 text-left transition-colors hover:border-[#4FB8B2]/35 hover:bg-zinc-900/70"
                    onClick={() => void navigate({ to: "/$projectSlug", params: { projectSlug }, search: { service: service.id, tab: "deployments" } })}
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        <AppIcon icon={PackageIcon} size={14} />
                        Service
                      </div>
                      <h2 className="mt-5 font-hero text-3xl font-bold tracking-tight text-zinc-100">{service.name}</h2>
                    </div>
                    <StatusPill status={service.status} />
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    <InfoRow icon={GitBranchIcon} label={service.branch} />
                    <InfoRow icon={FolderOpenIcon} label={service.rootDir || "Repository root"} />
                    {service.reachable ? (
                      <a
                        href={visibleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 border border-zinc-700 bg-zinc-900/85 px-3 py-3 text-sm text-zinc-200 transition hover:border-[#4FB8B2]/45 hover:text-[#7fe3dd]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <BrowserIconFallback size={17} />
                        <span className="truncate">{visibleLabel}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 border border-rose-500/20 bg-rose-950/20 px-3 py-3 text-sm text-rose-200">
                        <BrowserIconFallback size={17} />
                        <span className="truncate">Not reachable</span>
                      </div>
                    )}
                  </div>
                  </button>
                );
              })}
            </section>
          )}
        </div>
      </main>
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} onCreate={createProject} />
      <CreateServiceModal open={createServiceOpen} onClose={() => setCreateServiceOpen(false)} onCreate={createService} />
      {selectedService ? (
        <ServiceModal
          key={selectedService.id}
          projectSlug={projectSlug}
          selectedTab={selectedTab}
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
