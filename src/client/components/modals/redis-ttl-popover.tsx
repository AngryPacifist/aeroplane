import { useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "../ui/dropdown";
import { shellButton } from "../ui/primitives";

const ttlUnitOptions = [
  { value: "seconds", label: "Seconds" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" }
];

const unitMultipliers: Record<string, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400
};

function displayTtl(ttl: number) {
  if (ttl === -1) return "No expiry";
  if (ttl === -2) return "Expired";
  if (Number.isFinite(ttl) && ttl >= 0) return `${ttl}s`;
  return "Unknown";
}

export function RedisTtlPopover({
  ttl,
  busy,
  onSave
}: {
  ttl: unknown;
  busy: boolean;
  onSave: (seconds: number) => Promise<void> | void;
}) {
  const numericTtl = Number(ttl);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(Number.isFinite(numericTtl) ? String(numericTtl) : "-1");
  const [unit, setUnit] = useState("seconds");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const label = useMemo(() => displayTtl(numericTtl), [numericTtl]);

  useEffect(() => {
    if (!open) return;
    setValue(Number.isFinite(numericTtl) ? String(numericTtl) : "-1");
    setUnit("seconds");
  }, [numericTtl, open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function saveTtl(seconds: number) {
    await onSave(seconds);
    setOpen(false);
  }

  function saveFromFields() {
    const amount = Number(value);
    const multiplier = unitMultipliers[unit] ?? 1;
    const seconds = amount < 0 ? -1 : Math.floor(amount * multiplier);
    void saveTtl(seconds);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        TTL: {label}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[360px] border border-zinc-700 bg-zinc-950 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)]" role="dialog" aria-label="Expiration">
          <div className="font-hero text-lg text-zinc-100">Expiration</div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_150px]">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-11 min-w-0 border border-zinc-700 bg-zinc-900 px-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-[#4FB8B2]/60"
              inputMode="numeric"
            />
            <Dropdown value={unit} options={ttlUnitOptions} onChange={setUnit} />
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">TTL sets a timer to automatically delete keys after a defined period.</p>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button type="button" className={shellButton("secondary")} onClick={() => void saveTtl(-1)} disabled={busy}>
              Persist
            </button>
            <div className="flex gap-2">
              <button type="button" className={shellButton("ghost")} onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className={shellButton("primary")} onClick={saveFromFields} disabled={busy}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
