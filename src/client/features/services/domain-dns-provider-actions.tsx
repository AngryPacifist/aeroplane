import type { DnsProviderId, DnsProviderStatus } from "../../api";
import { shellButton } from "../../components/ui/primitives";

export function DomainDnsProviderActions({
  providers,
  busyProviderId,
  onApply
}: {
  providers: DnsProviderStatus[];
  busyProviderId: DnsProviderId | null;
  onApply: (providerId: DnsProviderId) => void;
}) {
  const connectedProviders = providers.filter((provider) => provider.connected);
  if (connectedProviders.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {connectedProviders.map((provider) => {
        const busy = busyProviderId === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            className={`${shellButton("secondary")} !min-h-8 !px-3 !py-2 text-[10px]`}
            disabled={Boolean(busyProviderId)}
            onClick={() => onApply(provider.id)}
          >
            {busy ? `Adding to ${provider.name}...` : `Add to ${provider.name}`}
          </button>
        );
      })}
    </div>
  );
}
