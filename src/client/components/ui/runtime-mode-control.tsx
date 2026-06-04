import { Globe02Icon, WorkflowSquare07Icon } from "@hugeicons/core-free-icons";
import { AppIcon } from "./primitives";

export type RuntimeMode = "web" | "worker";

const runtimeModeOptions: Array<{ value: RuntimeMode; label: string; icon: unknown }> = [
  { value: "web", label: "Web service", icon: Globe02Icon },
  { value: "worker", label: "Worker", icon: WorkflowSquare07Icon }
];

export function RuntimeModeControl({ value, onChange, disabled = false }: { value: RuntimeMode; onChange: (mode: RuntimeMode) => void; disabled?: boolean }) {
  return (
    <div className="inline-grid w-full max-w-sm grid-cols-2 gap-2">
      {runtimeModeOptions.map((mode) => (
        <button
          key={mode.value}
          type="button"
          className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 border px-3 text-sm transition disabled:opacity-60 ${
            value === mode.value
              ? "border-[#4FB8B2]/60 bg-[#4FB8B2]/10 text-zinc-100"
              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          }`}
          disabled={disabled}
          onClick={() => onChange(mode.value)}
        >
          <AppIcon icon={mode.icon} size={16} className="shrink-0" />
          <span className="truncate">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
