import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.env.AEROPLANE_ENV_PATH ?? resolve(process.cwd(), ".env.local"));
const blockStart = "# --- Aeroplane managed settings ---";
const blockEnd = "# --- End Aeroplane managed settings ---";

export type ManagedEnvValues = Record<string, string | number | boolean | null | undefined>;

function quoteEnvValue(value: string) {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function renderManagedBlock(values: ManagedEnvValues) {
  const lines = [blockStart];
  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === undefined || rawValue === null) {
      delete process.env[key];
      continue;
    }
    if (rawValue === "") {
      lines.push(`${key}=`);
      process.env[key] = "";
      continue;
    }
    const value = String(rawValue);
    lines.push(`${key}=${quoteEnvValue(value)}`);
    process.env[key] = value;
  }
  lines.push(blockEnd);
  return lines.join("\n");
}

function parseEnvBlock(source: string) {
  const values: ManagedEnvValues = {};
  const startIndex = source.indexOf(blockStart);
  const endIndex = source.indexOf(blockEnd);
  if (startIndex < 0 || endIndex <= startIndex) return values;

  const block = source.slice(startIndex + blockStart.length, endIndex);
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = rawLine.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = rawLine.slice(0, separatorIndex).trim();
    let value = rawLine.slice(separatorIndex + 1).trim();
    if (!key) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    }
    values[key] = value;
  }

  return values;
}

export function writeManagedEnv(values: ManagedEnvValues) {
  const source = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const block = renderManagedBlock(values);
  const startIndex = source.indexOf(blockStart);
  const endIndex = source.indexOf(blockEnd);

  let nextSource = "";
  if (startIndex >= 0 && endIndex > startIndex) {
    const before = source.slice(0, startIndex).trimEnd();
    const after = source.slice(endIndex + blockEnd.length).trimStart();
    nextSource = [before, block, after].filter(Boolean).join("\n\n");
  } else {
    nextSource = [source.trimEnd(), block].filter(Boolean).join("\n\n");
  }

  writeFileSync(envPath, `${nextSource.trimEnd()}\n`, "utf8");
  return envPath;
}

export function writeManagedEnvPatch(values: ManagedEnvValues) {
  const source = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  return writeManagedEnv({ ...parseEnvBlock(source), ...values });
}

export function managedEnvPath() {
  return envPath;
}
