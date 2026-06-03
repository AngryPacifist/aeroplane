import { BrandMark } from "../../components/ui/brand-mark";
import { SkeletonBlock } from "../../components/ui/skeleton";

export function OnboardingPageSkeleton() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-zinc-950 px-5 py-8 text-zinc-100">
      <div
        aria-hidden
        className="hero-noise pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_0%_0%,rgba(79,184,178,0.12),transparent),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(120,113,255,0.08),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <div
        role="status"
        aria-label="Loading onboarding"
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6"
      >
        <span className="sr-only">Loading onboarding</span>
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#4FB8B2]">
              <BrandMark />
            </div>
            <div>
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="mt-3 h-6 w-48" />
            </div>
          </div>
          <SkeletonBlock className="h-4 w-24" />
        </header>

        <section className="grid gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-16 border border-zinc-800"
            />
          ))}
        </section>

        <section className="border border-zinc-800 bg-zinc-950/60 p-5">
          <SkeletonBlock className="h-4 w-36" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SkeletonBlock className="h-11 border border-zinc-700" />
            <SkeletonBlock className="h-11 border border-zinc-700" />
            <SkeletonBlock className="h-11 border border-zinc-700" />
            <SkeletonBlock className="h-11 border border-zinc-700" />
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-5">
            <SkeletonBlock className="h-10 w-24" />
            <SkeletonBlock className="h-10 w-32 border border-[#4FB8B2]/25" />
          </div>
        </section>
      </div>
    </main>
  );
}
