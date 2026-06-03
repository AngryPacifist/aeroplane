import { SkeletonBlock } from "../../components/ui/skeleton";

function ServicePanelSkeleton() {
  return (
    <div className="space-y-5">
      <section className="border border-zinc-800 bg-zinc-950/50 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonBlock className="h-12 w-12 shrink-0 border border-zinc-800" />
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-7 w-56 max-w-full" />
                <SkeletonBlock className="mt-3 h-3 w-72 max-w-full" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                >
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="mt-3 h-4 w-28" />
                  <SkeletonBlock className="mt-2 h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
          <SkeletonBlock className="h-11 w-full border border-[#4FB8B2]/25 lg:w-40" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="border border-zinc-800 bg-zinc-950/45 p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <SkeletonBlock className="h-4 w-4" />
              <SkeletonBlock className="h-3 w-36" />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-4/5" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function ServicePageSkeleton() {
  const tabs = ["w-28", "w-32", "w-20", "w-28", "w-24", "w-24"];

  return (
    <main className="relative isolate h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden
        className="hero-noise pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_0%_0%,rgba(79,184,178,0.10),transparent),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(120,113,255,0.06),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <div
        role="status"
        aria-label="Loading service"
        className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col px-5 py-10 sm:px-6 lg:px-10"
      >
        <span className="sr-only">Loading service</span>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <SkeletonBlock className="h-9 w-9 border border-zinc-700" />
            <SkeletonBlock className="h-9 w-56 max-w-full border border-zinc-700" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((width, index) => (
            <SkeletonBlock
              key={index}
              className={`h-8 ${width} border border-zinc-700`}
            />
          ))}
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <ServicePanelSkeleton />
        </div>
      </div>
    </main>
  );
}
