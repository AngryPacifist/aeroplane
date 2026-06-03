import { databaseTypeForService } from "./database-urls.js";
import { databaseImage } from "./database-runtime.js";
import { getRailwayImportSource } from "./service-import-sources.js";
import type { Service } from "./schema.js";

function parseMetadata(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function dockerRepository(image: string) {
  const withoutDigest = image.split("@")[0] ?? image;
  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");
  return (lastColon > lastSlash ? withoutDigest.slice(0, lastColon) : withoutDigest).toLowerCase();
}

function normalizeSourceImage(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  return trimmed;
}

function isTrustedTimescaleImage(image: string) {
  return new Set([
    "timescale/timescaledb",
    "timescale/timescaledb-ha",
    "docker.io/timescale/timescaledb",
    "docker.io/timescale/timescaledb-ha"
  ]).has(dockerRepository(image));
}

export function importedTimescaleSourceImageForService(service: Service) {
  if (databaseTypeForService(service) !== "timescale") return null;

  const source = getRailwayImportSource(service.id);
  const metadata = parseMetadata(source?.metadata ?? null);
  const sourceImage = normalizeSourceImage(metadata?.sourceImage);
  if (!sourceImage || !isTrustedTimescaleImage(sourceImage)) return null;

  return sourceImage;
}

export function databaseImageForService(service: Service, dbType = databaseTypeForService(service)) {
  if (dbType === "timescale") {
    return importedTimescaleSourceImageForService(service) ?? databaseImage(dbType);
  }

  return databaseImage(dbType);
}
