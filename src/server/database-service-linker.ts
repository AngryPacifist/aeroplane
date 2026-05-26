import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { buildDatabaseConnectionUrl, databaseTypeForService, isDatabaseService } from "./database-urls.js";
import { db, nowIso } from "./db.js";
import { envVars, services } from "./schema.js";

type DatabaseUrlMatch = {
  key: string;
  value: string;
};

function upsertEnvVar(serviceId: string, key: string, value: string, timestamp = nowIso()) {
  db.insert(envVars)
    .values({
      id: nanoid(10),
      serviceId,
      key,
      value,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [envVars.serviceId, envVars.key],
      set: { value, updatedAt: timestamp }
    })
    .run();
}

function shouldReplaceDatabaseUrl(value: string | undefined) {
  if (value === undefined) return true;

  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.includes("${")) return true;

  const lower = trimmed.toLowerCase();
  return (
    lower.includes("railway") ||
    lower.includes("rlwy") ||
    lower.includes("127.0.0.1") ||
    lower.includes("localhost")
  );
}

function mapEnvRows(serviceIds: string[]) {
  const envsByServiceId = new Map<string, Map<string, string>>();
  for (const serviceId of serviceIds) {
    envsByServiceId.set(serviceId, new Map());
  }

  const rows = serviceIds.length > 0
    ? db.select().from(envVars).where(inArray(envVars.serviceId, serviceIds)).all()
    : [];

  for (const row of rows) {
    envsByServiceId.get(row.serviceId)?.set(row.key, row.value);
  }

  return envsByServiceId;
}

export function syncProjectDatabaseConnectionEnv(projectId: string) {
  const projectServices = db.select().from(services).where(eq(services.projectId, projectId)).all();
  const databaseServices = projectServices.filter((service) => isDatabaseService(service));
  if (databaseServices.length === 0) {
    return { linked: 0 };
  }

  const timestamp = nowIso();
  const serviceIds = projectServices.map((service) => service.id);
  const envsByServiceId = mapEnvRows(serviceIds);
  const urlsByKey = new Map<string, DatabaseUrlMatch[]>();

  for (const databaseService of databaseServices) {
    const dbType = databaseTypeForService(databaseService);
    const envMap = envsByServiceId.get(databaseService.id) ?? new Map<string, string>();
    const connectionUrl = buildDatabaseConnectionUrl({
      dbType,
      envMap,
      host: databaseService.slug,
      port: databaseService.internalPort
    });

    if (envMap.get(connectionUrl.key) !== connectionUrl.value) {
      upsertEnvVar(databaseService.id, connectionUrl.key, connectionUrl.value, timestamp);
      envMap.set(connectionUrl.key, connectionUrl.value);
    }

    const matches = urlsByKey.get(connectionUrl.key) ?? [];
    matches.push({
      key: connectionUrl.key,
      value: connectionUrl.value
    });
    urlsByKey.set(connectionUrl.key, matches);
  }

  const unambiguousUrls = Array.from(urlsByKey.values())
    .filter((matches) => matches.length === 1)
    .map((matches) => matches[0]);

  let linked = 0;
  for (const service of projectServices) {
    if (isDatabaseService(service)) continue;

    const serviceEnv = envsByServiceId.get(service.id) ?? new Map<string, string>();
    for (const match of unambiguousUrls) {
      if (!shouldReplaceDatabaseUrl(serviceEnv.get(match.key))) continue;

      upsertEnvVar(service.id, match.key, match.value, timestamp);
      serviceEnv.set(match.key, match.value);
      linked += 1;
    }
  }

  return { linked };
}
