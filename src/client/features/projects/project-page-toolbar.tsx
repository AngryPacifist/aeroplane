import { ArrowDown01Icon, ArrowLeft01Icon, FolderCodeIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import type { ProjectCard } from "../../api";
import { AppIcon } from "../../components/ui/primitives";

export function ProjectPageToolbar({
  projects,
  currentProject,
  fallbackProjectName,
  onBack,
  onProjectSelect
}: {
  projects: ProjectCard[];
  currentProject: ProjectCard | null;
  fallbackProjectName: string;
  onBack: () => void;
  onProjectSelect: (projectSlug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const otherProjects = projects.filter((project) => project.id !== currentProject?.id);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center border border-zinc-700 bg-zinc-950/70 text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
        onClick={onBack}
        aria-label="Back to all projects"
      >
        <AppIcon icon={ArrowLeft01Icon} size={15} />
      </button>

      <div ref={menuRef} className="relative min-w-0">
        <button
          type="button"
          className="inline-flex h-9 max-w-[340px] items-center justify-center gap-2 border border-zinc-700 bg-zinc-950/70 px-3 text-sm text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="grid h-5 w-5 flex-none place-items-center overflow-hidden border border-zinc-800 bg-zinc-900 text-zinc-400">
            <AppIcon icon={FolderCodeIcon} size={14} />
          </span>
          <span className="min-w-0 truncate">{currentProject?.name ?? fallbackProjectName}</span>
          <AppIcon icon={ArrowDown01Icon} size={14} className={open ? "rotate-180" : ""} />
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] border border-zinc-700 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="border-b border-zinc-800 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Switch project</div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {otherProjects.length === 0 ? (
                <div className="px-3 py-4 text-sm text-zinc-500">No other projects yet.</div>
              ) : (
                otherProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-900 hover:text-white"
                    onClick={() => {
                      setOpen(false);
                      onProjectSelect(project.slug);
                    }}
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center overflow-hidden border border-zinc-800 bg-zinc-900 text-zinc-400">
                      <AppIcon icon={FolderCodeIcon} size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                      {project.serviceCount} service{project.serviceCount === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
