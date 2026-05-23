import { Delete02Icon } from "@hugeicons/core-free-icons";
import { AppIcon, shellButton, surfaceClass } from "../ui/primitives";

export function DeleteProjectModal({
  open,
  projectName,
  busy,
  onClose,
  onConfirm
}: {
  open: boolean;
  projectName: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="delete-project-title" className={surfaceClass("w-full max-w-md p-5")}>
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 flex-none place-items-center border border-rose-500/35 bg-rose-500/10 text-rose-200">
            <AppIcon icon={Delete02Icon} size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-project-title" className="font-hero text-xl tracking-tight text-zinc-100">
              Delete project
            </h2>
            <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">{projectName}</p>
          </div>
        </div>

        <p className="mt-5 border border-rose-500/25 bg-rose-950/20 px-4 py-3 text-sm leading-relaxed text-rose-100">
          This will permanently remove this project and every service inside it.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={shellButton("ghost")} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={shellButton("danger")} onClick={onConfirm} disabled={busy}>
            <AppIcon icon={Delete02Icon} size={16} />
            Delete project
          </button>
        </div>
      </div>
    </div>
  );
}
