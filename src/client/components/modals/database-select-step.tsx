import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { AppIcon, shellButton } from "../ui/primitives";
import { DATABASE_OPTIONS, type DatabaseType } from "./database-service-options";

interface DatabaseSelectStepProps {
  onSelect: (dbType: DatabaseType) => void;
  onBack: () => void;
}

export function DatabaseSelectStep({ onSelect, onBack }: DatabaseSelectStepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mx-auto mb-6 w-full max-w-2xl overflow-hidden border border-zinc-800 bg-zinc-900/45">
        {DATABASE_OPTIONS.map((db) => (
          <button
            key={db.key}
            type="button"
            onClick={() => onSelect(db.key)}
            className="group grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-b border-zinc-800 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-[#4FB8B2]/6 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#4FB8B2]/45"
          >
            <span className="grid h-11 w-11 place-items-center border border-zinc-800 bg-zinc-950 p-2.5 transition group-hover:border-[#4FB8B2]/40 group-hover:bg-[#4FB8B2]/10">
              <img
                src={db.logoUrl}
                alt=""
                aria-hidden="true"
                className={db.logoClassName ?? "h-full w-full object-contain"}
                loading="lazy"
              />
            </span>

            <span className="min-w-0 truncate font-hero text-sm font-bold text-zinc-100 transition group-hover:text-[#7fe3dd]">
              {db.name}
            </span>

            <AppIcon icon={ArrowLeft01Icon} size={15} className="rotate-180 text-zinc-500 transition group-hover:text-[#7fe3dd]" />
          </button>
        ))}
      </div>

      <div className="flex justify-start shrink-0 border-t border-zinc-800 pt-4">
        <button type="button" className={shellButton("ghost")} onClick={onBack}>
          <AppIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </button>
      </div>
    </div>
  );
}
