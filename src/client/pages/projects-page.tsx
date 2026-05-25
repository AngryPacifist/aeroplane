import { useNavigate } from "@tanstack/react-router";
import { AddSquareIcon, FolderCodeIcon, Globe02Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { startTransition, useCallback, useEffect, useState } from "react";
import { api, type GitHubStatus, type ProjectCard, type ToolCheck } from "../api";
import { BrandMark } from "../components/ui/brand-mark";
import { AppIcon, FrameworkMark } from "../components/ui/primitives";
import { GitHubInstallModal } from "../features/github/github-install-modal";
import { CreateProjectModal } from "../features/projects/create-project-modal";
import { RailwayImportModal } from "../features/integrations/railway-import-modal";
import { SystemSettingsModal } from "../components/modals/system-settings-modal";
import { usePageTitle } from "../lib/page-title";

function ServiceCluster({ project }: { project: ProjectCard }) {
  const previewServices = project.services.slice(0, 7);
  const extraCount = Math.max(0, project.serviceCount - previewServices.length);

  return (
    <div className="border border-zinc-800/90 bg-zinc-950/55 p-2">
      <div className="flex min-h-[150px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:18px_18px] p-5">
        <div className="grid grid-cols-4 gap-2">
          {previewServices.map((service) => (
            <div
              key={service.id}
              className="flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-900/92 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <FrameworkMark framework={service.framework} size={17} fallback={<AppIcon icon={Globe02Icon} size={15} className="text-zinc-400" />} />
            </div>
          ))}
          {previewServices.length === 0 ? (
            <div className="flex h-full min-h-[150px] items-center justify-center text-xs text-zinc-600">No services yet.</div>
          ) : null}
          {extraCount > 0 ? (
            <div className="flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-900/92 font-mono text-xs tracking-[0.08em] text-zinc-400">
              +{extraCount}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  usePageTitle("Projects");

  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [tools, setTools] = useState<ToolCheck[]>([]);
  const [githubStatus, setGitHubStatus] = useState<null | GitHubStatus>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [railwayImportOpen, setRailwayImportOpen] = useState(false);
  const [githubInstallOpen, setGitHubInstallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    const [projectData, systemData, githubData] = await Promise.all([api.projects(), api.system(), api.githubStatus().catch(() => null)]);
    startTransition(() => {
      setProjects(projectData.projects);
      setTools(systemData.tools);
      setGitHubStatus(githubData);
      setGitHubInstallOpen(Boolean(githubData && githubData.mode === "app" && !githubData.installed && githubData.installUrl));
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
                <BrandMark />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">Aeroplane registry</div>
                <div className="font-hero text-lg tracking-tight text-zinc-100">Projects</div>
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
                className="inline-flex items-center justify-center gap-2 border border-[#E93D82]/50 bg-[#E93D82]/10 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E93D82] transition-colors hover:bg-[#E93D82]/20"
                onClick={() => setRailwayImportOpen(true)}
              >
                <AppIcon icon={AddSquareIcon} size={16} />
                Import from Railway
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 border border-[#4FB8B2]/50 bg-[#4FB8B2]/15 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4FB8B2] transition-colors hover:bg-[#4FB8B2]/25"
                onClick={() => setCreateOpen(true)}
              >
                <AppIcon icon={AddSquareIcon} size={16} />
                New project
              </button>
              <button
                type="button"
                className="inline-flex h-[38px] w-[38px] items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                title="System Settings"
                onClick={() => setSettingsOpen(true)}
              >
                <AppIcon icon={Settings01Icon} size={16} />
              </button>
            </div>
          </header>

          {error ? (
            <div className="border border-rose-500/35 bg-rose-950/30 px-4 py-3 font-mono text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          {projects.length === 0 ? (
            <section className="border border-zinc-800 bg-zinc-950/60 px-6 py-10 sm:px-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  <AppIcon icon={FolderCodeIcon} size={14} />
                  Empty registry
                </div>
                <h2 className="mt-6 font-hero text-3xl font-extrabold tracking-tight text-zinc-100">No projects yet</h2>
                <p className="mt-3 max-w-lg font-mono text-sm leading-relaxed text-zinc-500">
                  Create a project first, then attach services inside it. Each service gets its own deployment timeline, runtime logs, variables, and domains.
                </p>
                <button
                  type="button"
                  className="mt-8 inline-flex items-center justify-center gap-2 border border-[#4FB8B2]/50 bg-[#4FB8B2]/15 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4FB8B2] transition-colors hover:bg-[#4FB8B2]/25"
                  onClick={() => setCreateOpen(true)}
                >
                  <AppIcon icon={AddSquareIcon} size={16} />
                  Create project
                </button>
              </div>
            </section>
          ) : (
            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="group relative overflow-hidden border border-zinc-800 bg-zinc-950/68 p-5 text-left transition-colors hover:border-[#4FB8B2]/35 hover:bg-zinc-900/72"
                  onClick={() => void navigate({ to: "/$projectSlug", params: { projectSlug: project.slug } })}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,184,178,0.06),transparent_55%)]"
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-sans text-lg font-semibold tracking-tight text-zinc-100">{project.name}</h2>
                      </div>
                      <span className="shrink-0 border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
                        {project.serviceCount} service{project.serviceCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-5">
                      <ServiceCluster project={project} />
                    </div>
                  </div>
                </button>
              ))}
            </section>
          )}
        </div>
      </main>
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createProject} />
      <RailwayImportModal open={railwayImportOpen} onClose={() => setRailwayImportOpen(false)} onSuccess={loadProjects} />
      <GitHubInstallModal open={githubInstallOpen} status={githubStatus} onClose={() => setGitHubInstallOpen(false)} />
      <SystemSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
