import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const source = readFileSync(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

applyEnvFile(resolve(process.cwd(), ".env"));
applyEnvFile(resolve(process.cwd(), ".env.local"));

export const config = {
  port: Number(process.env.PORT ?? 4310),
  publicUrl: process.env.PUBLIC_URL ?? "http://localhost:5173",
  dataDir: resolve(process.env.DATA_DIR ?? "data"),
  deployDryRun: process.env.DEPLOY_DRY_RUN === "true",
  githubAccessToken: process.env.GITHUB_ACCESS_TOKEN ?? "",
  buildkitHost: process.env.BUILDKIT_HOST ?? "tcp://127.0.0.1:1234",
  hostPortStart: Number(process.env.DEPLOY_HOST_PORT_START ?? 4100),
  hostPortEnd: Number(process.env.DEPLOY_HOST_PORT_END ?? 4999),
  caddyConfigPath: resolve(process.env.CADDY_CONFIG_PATH ?? "data/Caddyfile"),
  caddyReloadCmd: process.env.CADDY_RELOAD_CMD ?? "caddy reload --config ./data/Caddyfile"
};
