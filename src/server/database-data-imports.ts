import { desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isPostgresFamilyDatabase } from "./database-engine.js";
import { databaseTypeForService, isDatabaseService } from "./database-urls.js";
import { db, nowIso } from "./db.js";
import { importPostgresDataFromRailway, preparePostgresDataImportFromRailway } from "./postgres-data-import.js";
import { getRailwayImportSource } from "./service-import-sources.js";
import { databaseDataImports, type DatabaseDataImport } from "./schema.js";
import { getServiceById } from "./deploy.js";

export type PublicDatabaseDataImport = {
  id: string;
  serviceId: string;
  engine: string;
  source: string;
  sourceLabel: string;
  sourceVariableKey: string | null;
  status: string;
  dumpSizeBytes: number | null;
  checksum: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

const activeImports = new Set<string>();

function publicDatabaseDataImport(row: DatabaseDataImport): PublicDatabaseDataImport {
  return {
    id: row.id,
    serviceId: row.serviceId,
    engine: row.engine,
    source: row.source,
    sourceLabel: row.sourceLabel,
    sourceVariableKey: row.sourceVariableKey,
    status: row.status,
    dumpSizeBytes: row.dumpSizeBytes,
    checksum: row.checksum,
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt
  };
}

function assertPostgresDatabaseService(serviceId: string) {
  const service = getServiceById(serviceId);
  if (!service || !isDatabaseService(service)) {
    throw new Error("Database service not found");
  }

  const engine = databaseTypeForService(service);
  if (!isPostgresFamilyDatabase(engine)) {
    throw new Error("Railway data import is only available for Postgres-compatible services.");
  }

  return { service, engine };
}

function latestActiveImport(serviceId: string) {
  return db
    .select()
    .from(databaseDataImports)
    .where(inArray(databaseDataImports.status, ["queued", "running"]))
    .orderBy(desc(databaseDataImports.createdAt))
    .all()
    .find((row) => row.serviceId === serviceId) ?? null;
}

function updateImport(id: string, values: Partial<DatabaseDataImport>) {
  db.update(databaseDataImports).set(values).where(eq(databaseDataImports.id, id)).run();
}

async function runRailwayPostgresImportJob(importId: string, serviceId: string, apiToken: string) {
  activeImports.add(importId);
  updateImport(importId, { status: "running", startedAt: nowIso() });

  try {
    const result = await importPostgresDataFromRailway(serviceId, apiToken);
    updateImport(importId, {
      status: "succeeded",
      sourceLabel: result.sourceLabel,
      sourceVariableKey: result.sourceVariableKey ?? null,
      dumpSizeBytes: result.dumpSizeBytes,
      checksum: result.checksum,
      error: null,
      finishedAt: result.importedAt
    });
  } catch (error) {
    updateImport(importId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Could not import Railway Postgres data",
      finishedAt: nowIso()
    });
  } finally {
    activeImports.delete(importId);
  }
}

export function listDatabaseDataImports(serviceId: string) {
  assertPostgresDatabaseService(serviceId);
  return db
    .select()
    .from(databaseDataImports)
    .where(eq(databaseDataImports.serviceId, serviceId))
    .orderBy(desc(databaseDataImports.createdAt))
    .limit(20)
    .all()
    .map(publicDatabaseDataImport);
}

export function startRailwayPostgresDataImportJob(serviceId: string, apiToken: string) {
  const { engine } = assertPostgresDatabaseService(serviceId);
  const activeImport = latestActiveImport(serviceId);
  if (activeImport) return publicDatabaseDataImport(activeImport);

  const source = getRailwayImportSource(serviceId);
  const importId = nanoid(10);
  const timestamp = nowIso();
  const row = {
    id: importId,
    serviceId,
    engine,
    source: "railway",
    sourceLabel: source?.externalServiceName ?? "Railway Postgres",
    sourceVariableKey: null,
    status: "queued",
    dumpSizeBytes: null,
    checksum: null,
    error: null,
    createdAt: timestamp,
    startedAt: null,
    finishedAt: null
  };

  db.insert(databaseDataImports).values(row).run();
  void runRailwayPostgresImportJob(importId, serviceId, apiToken);
  return publicDatabaseDataImport(row);
}

export async function prepareRailwayPostgresDataImport(serviceId: string, apiToken: string) {
  assertPostgresDatabaseService(serviceId);
  return preparePostgresDataImportFromRailway(serviceId, apiToken);
}
