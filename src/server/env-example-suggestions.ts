import { readRepoFile } from "./github-connect.js";

export type EnvExampleVariableSuggestion = {
  key: string;
  value: string;
  label: string;
  sourcePath: string;
};

type EnvExampleSuggestionOptions = {
  repoFullName: string;
  branch: string;
  rootDir: null | string;
  excludedKeys?: Iterable<string>;
};

function normalizeRootDir(rootDir: null | string) {
  return rootDir?.trim().replace(/^\/+|\/+$/g, "") ?? "";
}

function envExamplePaths(rootDir: null | string) {
  const normalizedRoot = normalizeRootDir(rootDir);
  return normalizedRoot ? [`${normalizedRoot}/.env.example`, ".env.example"] : [".env.example"];
}

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvExampleText(input: string, sourcePath: string, excludedKeys: Set<string>) {
  const byKey = new Map<string, EnvExampleVariableSuggestion>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;
    if (excludedKeys.has(key.toUpperCase())) continue;

    byKey.set(key, {
      key,
      value: normalizeEnvValue(normalized.slice(separatorIndex + 1)),
      label: `${sourcePath} variable`,
      sourcePath
    });
  }

  return Array.from(byKey.values());
}

export async function envExampleVariableSuggestions({
  repoFullName,
  branch,
  rootDir,
  excludedKeys = []
}: EnvExampleSuggestionOptions) {
  const excludedKeySet = new Set(Array.from(excludedKeys, (key) => key.toUpperCase()));

  for (const path of envExamplePaths(rootDir)) {
    const content = await readRepoFile(repoFullName, branch, path);
    if (content === null) continue;
    return parseEnvExampleText(content, path, excludedKeySet);
  }

  return [];
}
