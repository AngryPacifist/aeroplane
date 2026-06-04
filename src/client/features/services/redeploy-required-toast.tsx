import { Cancel01Icon, Rocket02Icon } from "@hugeicons/core-free-icons";
import { AppIcon } from "../../components/ui/primitives";

export function RedeployRequiredToast({
  visible,
  busy,
  serviceName,
  onDismiss,
  onRedeploy
}: {
  visible: boolean;
  busy: boolean;
  serviceName: string;
  onDismiss: () => void;
  onRedeploy: () => void;
}) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))]">
      <button
        type="button"
        className="group w-full border border-[#4FB8B2]/35 bg-zinc-950/95 p-4 pr-12 text-left shadow-[0_22px_80px_rgba(0,0,0,0.5)] backdrop-blur transition hover:border-[#4FB8B2]/60 hover:bg-zinc-900"
        onClick={onRedeploy}
        disabled={busy}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]">
            <AppIcon icon={Rocket02Icon} size={18} className={busy ? "animate-pulse" : ""} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7fe3dd]">Redeploy required</div>
              <div className="mt-1 text-sm font-medium text-zinc-100">{serviceName}</div>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Saved changes will take effect after a redeploy. Click to deploy and open the deployment output.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 group-hover:text-[#7fe3dd]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7fe3dd]" />
              {busy ? "Starting deployment" : "Deploy now"}
            </div>
          </div>
        </div>
      </button>
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
        onClick={onDismiss}
        aria-label="Dismiss redeploy reminder"
      >
        <AppIcon icon={Cancel01Icon} size={14} />
      </button>
    </div>
  );
}
