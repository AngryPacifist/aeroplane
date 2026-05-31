import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, nowIso } from "./db.js";
import { isDatabaseService } from "./database-urls.js";
import { domains, services, type Service } from "./schema.js";
import { normalizeRootDomain } from "./root-domain.js";
import { getSystemSettings } from "./system-settings.js";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generatedHostnamePattern(serviceSlug: string, rootDomain: string) {
  return new RegExp(`^${escapeRegex(serviceSlug)}(?:-\\d+)?\\.${escapeRegex(rootDomain)}$`);
}

export function isGeneratedServiceHostname(serviceSlug: string, hostname: string, rootDomainInput = getSystemSettings().rootDomain) {
  const rootDomain = normalizeRootDomain(rootDomainInput);
  if (!rootDomain) return false;

  return generatedHostnamePattern(serviceSlug, rootDomain).test(hostname);
}

function hostnameExists(hostname: string) {
  return Boolean(db.select({ id: domains.id }).from(domains).where(eq(domains.hostname, hostname)).get());
}

function uniqueGeneratedHostname(serviceSlug: string, rootDomain: string) {
  let hostname = `${serviceSlug}.${rootDomain}`;
  let counter = 1;

  while (hostnameExists(hostname)) {
    hostname = `${serviceSlug}-${counter}.${rootDomain}`;
    counter += 1;
  }

  return hostname;
}

export function ensureDefaultDomainForService(service: Service, rootDomainInput = getSystemSettings().rootDomain) {
  const rootDomain = normalizeRootDomain(rootDomainInput);
  if (!rootDomain || isDatabaseService(service)) return null;

  const existingServiceDomains = db.select().from(domains).where(eq(domains.serviceId, service.id)).all();
  const existingGeneratedDomain = existingServiceDomains.find((domain) => isGeneratedServiceHostname(service.slug, domain.hostname, rootDomain));
  if (existingGeneratedDomain) return existingGeneratedDomain;

  const timestamp = nowIso();
  const domain = {
    id: nanoid(10),
    serviceId: service.id,
    hostname: uniqueGeneratedHostname(service.slug, rootDomain),
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.insert(domains).values(domain).run();
  return domain;
}

export function ensureDefaultDomainsForExistingServices(rootDomainInput = getSystemSettings().rootDomain) {
  const rootDomain = normalizeRootDomain(rootDomainInput);
  if (!rootDomain) return [];

  const created = [];
  for (const service of db.select().from(services).all()) {
    const beforeCount = db.select().from(domains).where(eq(domains.serviceId, service.id)).all().length;
    const domain = ensureDefaultDomainForService(service, rootDomain);
    const afterCount = db.select().from(domains).where(eq(domains.serviceId, service.id)).all().length;
    if (domain && afterCount > beforeCount) {
      created.push(domain);
    }
  }

  return created;
}
