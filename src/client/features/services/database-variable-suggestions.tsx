import { Add01Icon, DatabaseIcon } from "@hugeicons/core-free-icons";
import type { DatabaseVariableSuggestion, EnvVar } from "../../api";
import { AppIcon, shellButton } from "../../components/ui/primitives";

export function DatabaseVariableSuggestions({
  suggestions,
  env,
  busy,
  onInsert
}: {
  suggestions: DatabaseVariableSuggestion[];
  env: EnvVar[];
  busy: boolean;
  onInsert: (key: string, value: string) => Promise<void>;
}) {
  if (suggestions.length === 0) return null;

  const currentValues = new Map(env.map((item) => [item.key, item.value ?? ""]));

  return (
    <div className="border border-zinc-700 bg-zinc-900/88">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <AppIcon icon={DatabaseIcon} size={18} className="text-[#7fe3dd]" />
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Database variables</div>
      </div>
      <div className="divide-y divide-zinc-800">
        {suggestions.map((suggestion) => {
          const currentValue = currentValues.get(suggestion.key);
          const isCurrent = currentValue === suggestion.value;
          const actionLabel = isCurrent ? "Added" : currentValue === undefined ? "Insert" : "Replace";

          return (
            <div key={`${suggestion.serviceId}:${suggestion.key}`} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="truncate font-mono text-sm font-semibold uppercase tracking-[0.06em] text-zinc-100">{suggestion.key}</div>
                <div className="mt-1 truncate text-xs text-zinc-500">{suggestion.label}</div>
              </div>
              <div className="truncate font-mono text-xs text-zinc-500">{suggestion.serviceSlug}</div>
              <button
                type="button"
                className={shellButton(isCurrent ? "ghost" : "secondary")}
                disabled={busy || isCurrent}
                onClick={() => onInsert(suggestion.key, suggestion.value)}
              >
                <AppIcon icon={Add01Icon} size={15} />
                {actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
