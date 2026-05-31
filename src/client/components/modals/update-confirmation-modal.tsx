import { Cancel01Icon, Refresh03Icon } from "@hugeicons/core-free-icons";
import { AppIcon, shellButton, surfaceClass } from "../ui/primitives";

type UpdateConfirmationModalProps = {
  applying: boolean;
  installType: "git" | "image";
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function UpdateConfirmationModal({ applying, installType, open, onCancel, onConfirm }: UpdateConfirmationModalProps) {
  if (!open) return null;

  const actionLabel = installType === "image" ? "Pull latest image" : "Update Aeroplane";

  return (
    <div className="fixed inset-0 z-70 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <div className={surfaceClass("w-full max-w-lg p-5")}>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]">
            <AppIcon icon={Refresh03Icon} size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Confirm update</div>
            <h3 className="mt-1 font-hero text-xl tracking-tight text-zinc-100">{actionLabel}?</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Aeroplane may restart after the update finishes. The dashboard can briefly disconnect while the new build starts.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={shellButton("ghost")} onClick={onCancel} disabled={applying}>
            <AppIcon icon={Cancel01Icon} size={14} />
            Cancel
          </button>
          <button type="button" className={shellButton("primary")} onClick={onConfirm} disabled={applying}>
            <AppIcon icon={Refresh03Icon} size={13} className={applying ? "animate-spin" : ""} />
            {applying ? "Starting..." : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
