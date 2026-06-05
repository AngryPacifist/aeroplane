import type { DnsProviderDefinition } from "./dns-management-data";

export function DnsProviderLogo({
  provider,
  className = "h-5 w-5"
}: {
  provider: DnsProviderDefinition;
  className?: string;
}) {
  return <img src={provider.logoUrl} alt="" className={`object-contain ${className}`} />;
}
