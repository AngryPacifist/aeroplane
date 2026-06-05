import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { AppIcon, statusClass } from "../ui/primitives";
import type { DnsProviderDefinition } from "./dns-management-data";
import { DnsProviderLogo } from "./dns-provider-logo";

export function DnsProviderCard({
  provider,
  selected,
  connected,
  onSelect
}: {
  provider: DnsProviderDefinition;
  selected: boolean;
  connected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex min-h-28 items-start justify-between gap-3 border p-4 text-left transition ${
        selected
          ? "border-[#4FB8B2]/50 bg-[#4FB8B2]/10 shadow-[0_18px_50px_rgba(79,184,178,0.08)]"
          : "border-zinc-800 bg-zinc-950/35 hover:border-zinc-600 hover:bg-zinc-900/65"
      }`}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center border ${provider.logoFrameClass}`}>
          <DnsProviderLogo provider={provider} className="max-h-5 max-w-7" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-100">{provider.name}</span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{provider.label}</span>
        </span>
      </span>

      <span
        className={`inline-flex h-7 shrink-0 items-center gap-1.5 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${
          connected ? statusClass("active") : "border border-zinc-700 bg-zinc-900/70 text-zinc-500"
        }`}
      >
        {connected ? <AppIcon icon={CheckmarkCircle02Icon} size={12} /> : null}
        {connected ? "Connected" : "New"}
      </span>
    </button>
  );
}
