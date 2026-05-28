import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "../ui/primitives";

export function RedisKeyActionsMenu({
  disabled = false,
  onCopyContent,
  onCopyKey,
  onDelete
}: {
  disabled?: boolean;
  onCopyContent: () => Promise<void> | void;
  onCopyKey: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function runAction(action: () => Promise<void> | void) {
    setOpen(false);
    await action();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-label="Redis key actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <AppIcon icon={MoreVerticalIcon} size={17} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-52 border border-zinc-700 bg-zinc-950 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]" role="menu">
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-zinc-900"
            onClick={() => void runAction(onCopyContent)}
            role="menuitem"
          >
            Copy content
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-zinc-900"
            onClick={() => void runAction(onCopyKey)}
            role="menuitem"
          >
            Copy key
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-950/30"
            onClick={() => void runAction(onDelete)}
            role="menuitem"
          >
            Delete key
          </button>
        </div>
      ) : null}
    </div>
  );
}
