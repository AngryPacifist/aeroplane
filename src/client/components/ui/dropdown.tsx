import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "./primitives";

export type DropdownOption = {
  value: string;
  label: string;
};

export function Dropdown({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select...",
  className = ""
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between gap-3 border border-zinc-700 bg-zinc-900 px-3 text-left text-sm text-zinc-100 outline-none transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-zinc-500"}`}>{selected?.label ?? placeholder}</span>
        <AppIcon icon={ArrowDown01Icon} size={15} className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto border border-zinc-700 bg-zinc-950 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]" role="listbox">
          {options.length === 0 ? (
            <div className="px-2.5 py-2 text-sm text-zinc-500">No options</div>
          ) : options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`block w-full px-2.5 py-2 text-left text-sm transition ${
                  active ? "bg-[#4FB8B2]/15 text-[#7fe3dd]" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
              >
                <span className="block truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
