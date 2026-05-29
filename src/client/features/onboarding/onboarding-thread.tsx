import { AppIcon } from "../../components/ui/primitives";

export type OnboardingThreadStep = {
  label: string;
  icon: unknown;
};

export function OnboardingThread({
  steps,
  activeStep,
  onStepChange
}: {
  steps: OnboardingThreadStep[];
  activeStep: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <nav aria-label="Setup progress" className="overflow-x-auto border-y border-zinc-800/80 py-4">
      <ol className="flex min-w-[620px] items-start">
        {steps.map((item, index) => {
          const active = index === activeStep;
          const done = index < activeStep;
          const available = index <= activeStep;
          const tone = active
            ? "border-[#4FB8B2] bg-[#4FB8B2]/16 text-[#9af4ee] shadow-[0_0_24px_rgba(79,184,178,0.12)]"
            : done
              ? "border-[#4FB8B2]/45 bg-[#4FB8B2]/10 text-[#7fe3dd]"
              : "border-zinc-700 bg-zinc-950 text-zinc-500";

          return (
            <li key={item.label} className="relative flex min-w-0 flex-1 items-start">
              <button
                type="button"
                className={`group flex min-w-0 items-center gap-3 text-left ${available ? "cursor-pointer" : "cursor-default"}`}
                onClick={() => {
                  if (available) onStepChange(index);
                }}
                aria-current={active ? "step" : undefined}
              >
                <span className={`grid h-9 w-9 flex-none place-items-center rounded-full border transition ${tone}`}>
                  <AppIcon icon={item.icon} size={15} />
                </span>
                <span className="min-w-0">
                  <span className={`block font-mono text-[10px] uppercase tracking-[0.2em] ${active || done ? "text-[#9af4ee]" : "text-zinc-600"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={`block truncate font-mono text-[11px] font-semibold uppercase tracking-[0.2em] ${active ? "text-zinc-100" : done ? "text-zinc-300" : "text-zinc-600"}`}>
                    {item.label}
                  </span>
                </span>
              </button>

              {index < steps.length - 1 ? (
                <span className="mx-4 mt-[18px] h-px flex-1 bg-zinc-800">
                  <span className={`block h-px transition-colors ${done ? "bg-[#4FB8B2]/60" : "bg-transparent"}`} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
