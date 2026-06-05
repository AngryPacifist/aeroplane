import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";
import { decryptSecret, encryptSecret } from "./secret-crypto.js";

export interface SystemSettings {
  rootDomain: string;
  controlPlaneHostname: string;
  deploymentConcurrency: number;
  r2?: R2Settings | null;
  dns?: DnsSettings | null;
}

export interface R2Settings {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  connectedAt: string;
  updatedAt: string;
}

export type PublicR2Settings = {
  connected: boolean;
  accountId: string;
  bucket: string;
  endpoint: string;
  accessKeyIdSuffix: string;
  connectedAt: string | null;
  updatedAt: string | null;
};

export type DnsProviderId = "cloudflare" | "namecheap" | "spaceship";

export interface CloudflareDnsSettings {
  provider: "cloudflare";
  apiToken: string;
  accountEmail: string;
  zoneId: string;
  connectedAt: string;
  updatedAt: string;
}

export interface NamecheapDnsSettings {
  provider: "namecheap";
  apiUser: string;
  apiKey: string;
  clientIp: string;
  connectedAt: string;
  updatedAt: string;
}

export interface SpaceshipDnsSettings {
  provider: "spaceship";
  apiKey: string;
  apiSecret: string;
  connectedAt: string;
  updatedAt: string;
}

export type DnsProviderSettings = CloudflareDnsSettings | NamecheapDnsSettings | SpaceshipDnsSettings;

export type DnsSettings = Partial<{
  cloudflare: CloudflareDnsSettings;
  namecheap: NamecheapDnsSettings;
  spaceship: SpaceshipDnsSettings;
}>;

export type PublicDnsProviderSettings = {
  id: DnsProviderId;
  name: string;
  connected: boolean;
  values: Record<string, string>;
  secretSuffixes: Record<string, string>;
  keySuffix: string;
  connectedAt: string | null;
  updatedAt: string | null;
};

export type PublicDnsSettings = {
  providers: PublicDnsProviderSettings[];
};

const settingsPath = resolve(config.dataDir, "system-settings.json");
export const defaultDeploymentConcurrency = 3;
export const maxDeploymentConcurrency = 10;

export function normalizeDeploymentConcurrency(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return defaultDeploymentConcurrency;
  return Math.min(maxDeploymentConcurrency, Math.max(1, parsed));
}

function decryptR2Settings(r2: SystemSettings["r2"]): SystemSettings["r2"] {
  if (!r2) return null;
  try {
    return {
      ...r2,
      secretAccessKey: decryptSecret(r2.secretAccessKey)
    };
  } catch (error) {
    console.error("Failed to decrypt R2 settings:", error);
    return {
      ...r2,
      secretAccessKey: ""
    };
  }
}

function decryptSecretField(value: string, label: string) {
  try {
    return decryptSecret(value);
  } catch (error) {
    console.error(`Failed to decrypt ${label}:`, error);
    return "";
  }
}

function decryptDnsSettings(dns: SystemSettings["dns"]): SystemSettings["dns"] {
  if (!dns) return null;
  const next: DnsSettings = {};

  if (dns.cloudflare) {
    next.cloudflare = {
      provider: "cloudflare",
      apiToken: decryptSecretField(dns.cloudflare.apiToken, "Cloudflare DNS API token"),
      accountEmail: dns.cloudflare.accountEmail ?? "",
      zoneId: dns.cloudflare.zoneId ?? "",
      connectedAt: dns.cloudflare.connectedAt,
      updatedAt: dns.cloudflare.updatedAt
    };
  }

  if (dns.namecheap) {
    next.namecheap = {
      provider: "namecheap",
      apiUser: dns.namecheap.apiUser ?? "",
      apiKey: decryptSecretField(dns.namecheap.apiKey, "Namecheap DNS API key"),
      clientIp: dns.namecheap.clientIp ?? "",
      connectedAt: dns.namecheap.connectedAt,
      updatedAt: dns.namecheap.updatedAt
    };
  }

  if (dns.spaceship) {
    next.spaceship = {
      provider: "spaceship",
      apiKey: decryptSecretField(dns.spaceship.apiKey, "Spaceship DNS API key"),
      apiSecret: decryptSecretField(dns.spaceship.apiSecret, "Spaceship DNS API secret"),
      connectedAt: dns.spaceship.connectedAt,
      updatedAt: dns.spaceship.updatedAt
    };
  }

  return Object.keys(next).length > 0 ? next : null;
}

function encryptDnsSettings(dns: SystemSettings["dns"]): SystemSettings["dns"] {
  if (!dns) return null;
  const next: DnsSettings = {};

  if (dns.cloudflare) {
    next.cloudflare = {
      ...dns.cloudflare,
      apiToken: encryptSecret(dns.cloudflare.apiToken)
    };
  }

  if (dns.namecheap) {
    next.namecheap = {
      ...dns.namecheap,
      apiKey: encryptSecret(dns.namecheap.apiKey)
    };
  }

  if (dns.spaceship) {
    next.spaceship = {
      ...dns.spaceship,
      apiKey: encryptSecret(dns.spaceship.apiKey),
      apiSecret: encryptSecret(dns.spaceship.apiSecret)
    };
  }

  return Object.keys(next).length > 0 ? next : null;
}

function serializeSystemSettings(settings: SystemSettings): SystemSettings {
  const deploymentConcurrency = normalizeDeploymentConcurrency(settings.deploymentConcurrency);
  return {
    ...settings,
    deploymentConcurrency,
    r2: settings.r2
      ? {
          ...settings.r2,
          secretAccessKey: encryptSecret(settings.r2.secretAccessKey)
        }
      : null,
    dns: encryptDnsSettings(settings.dns ?? null)
  };
}

export function getSystemSettings(): SystemSettings {
  try {
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, "utf8");
      const parsed = JSON.parse(data) as Partial<SystemSettings>;
      return {
        rootDomain: parsed.rootDomain ?? "",
        controlPlaneHostname: parsed.controlPlaneHostname ?? "",
        deploymentConcurrency: normalizeDeploymentConcurrency(parsed.deploymentConcurrency),
        r2: decryptR2Settings(parsed.r2 ?? null),
        dns: decryptDnsSettings(parsed.dns ?? null)
      };
    }
  } catch (error) {
    console.error("Failed to read system settings:", error);
  }
  return {
    rootDomain: "",
    controlPlaneHostname: "",
    deploymentConcurrency: defaultDeploymentConcurrency,
    r2: null,
    dns: null
  };
}

export function deploymentConcurrency(settings = getSystemSettings()) {
  return normalizeDeploymentConcurrency(settings.deploymentConcurrency);
}

export function saveSystemSettings(settings: SystemSettings): void {
  try {
    writeFileSync(settingsPath, JSON.stringify(serializeSystemSettings(settings), null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save system settings:", error);
  }
}

function publicUrlHostname() {
  try {
    const hostname = new URL(process.env.PUBLIC_URL ?? config.publicUrl).hostname.toLowerCase();
    if (!hostname || hostname === "localhost" || hostname === "::1") return "";
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return "";
    return hostname;
  } catch {
    return "";
  }
}

export function configuredControlPlaneHostname(settings = getSystemSettings()) {
  const envHostname = String(process.env.CONTROL_PLANE_HOSTNAME ?? config.controlPlaneHostname ?? "").trim().toLowerCase();
  return envHostname || String(settings.controlPlaneHostname ?? "").trim().toLowerCase() || publicUrlHostname();
}

export function publicR2Settings(settings = getSystemSettings()): PublicR2Settings {
  const r2 = settings.r2;
  if (!r2) {
    return {
      connected: false,
      accountId: "",
      bucket: "",
      endpoint: "",
      accessKeyIdSuffix: "",
      connectedAt: null,
      updatedAt: null
    };
  }

  return {
    connected: true,
    accountId: r2.accountId,
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyIdSuffix: r2.accessKeyId.slice(-6),
    connectedAt: r2.connectedAt,
    updatedAt: r2.updatedAt
  };
}

function secretSuffix(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
}

export function publicDnsSettings(settings = getSystemSettings()): PublicDnsSettings {
  const dns = settings.dns ?? {};

  return {
    providers: [
      {
        id: "cloudflare",
        name: "Cloudflare",
        connected: Boolean(dns.cloudflare?.apiToken),
        values: {
          accountEmail: dns.cloudflare?.accountEmail ?? "",
          zoneId: dns.cloudflare?.zoneId ?? ""
        },
        secretSuffixes: {
          apiToken: secretSuffix(dns.cloudflare?.apiToken ?? "")
        },
        keySuffix: secretSuffix(dns.cloudflare?.apiToken ?? ""),
        connectedAt: dns.cloudflare?.connectedAt ?? null,
        updatedAt: dns.cloudflare?.updatedAt ?? null
      },
      {
        id: "namecheap",
        name: "Namecheap",
        connected: Boolean(dns.namecheap?.apiUser && dns.namecheap.apiKey),
        values: {
          apiUser: dns.namecheap?.apiUser ?? "",
          clientIp: dns.namecheap?.clientIp ?? ""
        },
        secretSuffixes: {
          apiKey: secretSuffix(dns.namecheap?.apiKey ?? "")
        },
        keySuffix: secretSuffix(dns.namecheap?.apiKey ?? ""),
        connectedAt: dns.namecheap?.connectedAt ?? null,
        updatedAt: dns.namecheap?.updatedAt ?? null
      },
      {
        id: "spaceship",
        name: "Spaceship",
        connected: Boolean(dns.spaceship?.apiKey && dns.spaceship.apiSecret),
        values: {},
        secretSuffixes: {
          apiKey: secretSuffix(dns.spaceship?.apiKey ?? ""),
          apiSecret: secretSuffix(dns.spaceship?.apiSecret ?? "")
        },
        keySuffix: secretSuffix(dns.spaceship?.apiKey ?? ""),
        connectedAt: dns.spaceship?.connectedAt ?? null,
        updatedAt: dns.spaceship?.updatedAt ?? null
      }
    ]
  };
}
