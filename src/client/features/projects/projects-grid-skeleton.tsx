import { SkeletonBlock } from "../../components/ui/skeleton";

function ProjectCardSkeleton() {
  return (
    <div className="relative overflow-hidden border border-zinc-800 bg-zinc-950/68 p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:72px_72px] opacity-45"
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-5 w-40" />
          </div>
          <SkeletonBlock className="h-7 w-24 shrink-0" />
        </div>

        <div className="mt-5 border border-zinc-800/90 bg-zinc-950/55 p-2">
          <div className="flex min-h-[150px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[18px_18px] p-5">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className="h-10 w-10 border border-zinc-700"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsGridSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading projects"
      className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only">Loading projects</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </section>
  );
}
