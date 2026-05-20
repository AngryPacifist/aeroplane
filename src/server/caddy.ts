import { and, eq } from "drizzle-orm";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { config } from "./config.js";
import { db } from "./db.js";
import { domains, services } from "./schema.js";

function shellWords(command: string) {
  return command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) ?? [];
}

function caddyAddress(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".localhost") ? `http://${hostname}` : hostname;
}

export function renderCaddyfile() {
  const rows = db
    .select({
      hostname: domains.hostname,
      serviceId: domains.serviceId,
      hostPort: services.hostPort
    })
    .from(domains)
    .innerJoin(services, eq(services.id, domains.serviceId))
    .where(and(eq(domains.status, "active"), eq(services.status, "active")))
    .all();

  const blocks = rows.map(
    (row) => `${caddyAddress(row.hostname)} {
  encode zstd gzip
  reverse_proxy 127.0.0.1:${row.hostPort}
}`
  );

  return [`# Managed by Deploy. Manual changes may be overwritten.`, ...blocks].join("\n\n") + "\n";
}

export async function writeAndReloadCaddy() {
  mkdirSync(dirname(config.caddyConfigPath), { recursive: true });
  writeFileSync(config.caddyConfigPath, renderCaddyfile(), "utf8");

  const [cmd, ...args] = shellWords(config.caddyReloadCmd);
  if (!cmd) {
    return { ok: false, detail: "CADDY_RELOAD_CMD is empty" };
  }

  return new Promise<{ ok: boolean; detail: string }>((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) => resolve({ ok: false, detail: error.message }));
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        detail: output.trim() || `caddy reload exited with ${code}`
      });
    });
  });
}
