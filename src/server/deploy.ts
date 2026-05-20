import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { config } from "./config.js";
import { db, nowIso, sqlite } from "./db.js";
import { publishDeploymentLog } from "./logBus.js";
import { deploymentLogs, deployments, envVars, services, type Deployment, type Service } from "./schema.js";
import { writeAndReloadCaddy } from "./caddy.js";

type RunOptions = {
  cwd?: string;
  env?: Record<string, string>;
  redact?: string[];
};

type EnqueueOptions = {
  commitSha?: string;
  trigger: "manual" | "github";
};

let workerActive = false;
let workerStarted = false;

function now() {
  return nowIso();
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "app";
}

function redactLine(line: string, secrets: string[]) {
  let redacted = line;
  for (const secret of secrets) {
    if (secret.length >= 4) {
      redacted = redacted.split(secret).join("[redacted]");
    }
  }
  return redacted;
}

function appendDeploymentLog(deploymentId: string, line: string, stream = "system", secrets: string[] = []) {
  const cleanLine = redactLine(line, secrets);
  const createdAt = now();
  const result = db
    .insert(deploymentLogs)
    .values({ deploymentId, line: cleanLine, stream, createdAt })
    .run();
  const log = {
    id: Number(result.lastInsertRowid),
    deploymentId,
    line: cleanLine,
    stream,
    createdAt
  };
  publishDeploymentLog(log);
  return log;
}

function runCommand(command: string, args: string[], deploymentId: string, options: RunOptions = {}) {
  const redactions = options.redact ?? [];
  appendDeploymentLog(deploymentId, `$ ${[command, ...args].map((part) => redactLine(part, redactions)).join(" ")}`);

  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const handleChunk = (stream: "stdout" | "stderr") => (chunk: Buffer) => {
      const lines = chunk.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().length > 0) {
          appendDeploymentLog(deploymentId, line, stream, redactions);
        }
      }
    };

    child.stdout.on("data", handleChunk("stdout"));
    child.stderr.on("data", handleChunk("stderr"));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} exited with ${code}`));
      }
    });
  });
}

function cloneUrlWithToken(repoUrl: string, token?: string | null) {
  if (!token || !repoUrl.startsWith("https://github.com/")) {
    return repoUrl;
  }

  const url = new URL(repoUrl);
  url.username = "x-access-token";
  url.password = token;
  return url.toString();
}

function getEnvForService(serviceId: string) {
  const rows = db.select().from(envVars).where(eq(envVars.serviceId, serviceId)).all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function getServiceById(serviceId: string) {
  return db.select().from(services).where(eq(services.id, serviceId)).get();
}

export function allocateHostPort() {
  const used = new Set(db.select({ hostPort: services.hostPort }).from(services).all().map((row) => row.hostPort));
  for (let port = config.hostPortStart; port <= config.hostPortEnd; port += 1) {
    if (!used.has(port)) {
      return port;
    }
  }
  throw new Error("No host ports are available in the configured deployment range.");
}

export async function removeServiceRuntime(service: Service) {
  const containerName = `deploy-${service.id.toLowerCase()}`;
  return new Promise<void>((resolvePromise) => {
    const child = spawn("docker", ["rm", "-f", containerName], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.on("error", () => resolvePromise());
    child.on("close", () => resolvePromise());
  });
}

export function enqueueDeployment(serviceId: string, options: EnqueueOptions) {
  const service = getServiceById(serviceId);
  if (!service) {
    throw new Error("Service not found");
  }

  const createdAt = now();
  const deployment: Deployment = {
    id: nanoid(12),
    serviceId,
    commitSha: options.commitSha ?? null,
    status: "queued",
    trigger: options.trigger,
    imageTag: null,
    containerName: null,
    startedAt: null,
    finishedAt: null,
    createdAt
  };

  db.insert(deployments).values(deployment).run();
  appendDeploymentLog(deployment.id, `Deployment queued from ${options.trigger}.`);
  return deployment;
}

async function runDeployment(deployment: Deployment, service: Service) {
  const startedAt = now();
  const imageTag = `deploy-${safeSlug(service.name)}-${service.id.toLowerCase()}:${deployment.id.toLowerCase()}`;
  const containerName = `deploy-${service.id.toLowerCase()}`;
  const buildRoot = resolve(config.dataDir, "builds", deployment.id);
  const sourceDir = join(buildRoot, "source");
  const appDir = service.rootDir ? join(sourceDir, service.rootDir) : sourceDir;
  const env = getEnvForService(service.id);
  const authToken = service.githubToken ?? config.githubAccessToken;
  const secrets = [authToken ?? "", ...Object.values(env)].filter(Boolean);

  rmSync(buildRoot, { recursive: true, force: true });
  mkdirSync(buildRoot, { recursive: true });

  db.update(deployments)
    .set({ status: "building", startedAt, imageTag, containerName })
    .where(eq(deployments.id, deployment.id))
    .run();
  db.update(services).set({ status: "building", updatedAt: now() }).where(eq(services.id, service.id)).run();

  appendDeploymentLog(deployment.id, `Preparing workspace for ${service.name}.`);

  try {
    if (config.deployDryRun) {
      appendDeploymentLog(deployment.id, "Dry-run mode is enabled. Skipping clone, Railpack build, and Docker run.");
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 800));
      db.update(deployments)
        .set({ status: "running", finishedAt: now(), imageTag, containerName })
        .where(eq(deployments.id, deployment.id))
        .run();
      db.update(services)
        .set({ status: "active", lastDeployedAt: now(), updatedAt: now() })
        .where(eq(services.id, service.id))
        .run();
      appendDeploymentLog(deployment.id, `Dry-run deployment marked running on port ${service.hostPort}.`);
      return;
    }

    const cloneUrl = cloneUrlWithToken(service.repoUrl, authToken);
    await runCommand("git", ["clone", "--depth", "1", "--branch", service.branch, cloneUrl, sourceDir], deployment.id, {
      redact: secrets
    });

    if (deployment.commitSha) {
      await runCommand("git", ["checkout", deployment.commitSha], deployment.id, { cwd: sourceDir });
    }

    const railpackEnv: Record<string, string> = {
      ...env,
      BUILDKIT_HOST: config.buildkitHost,
      PORT: String(service.internalPort),
      RAILPACK_START_CMD: service.startCommand ?? "",
      RAILPACK_BUILD_CMD: service.buildCommand ?? "",
      RAILPACK_INSTALL_CMD: service.installCommand ?? "",
      FORCE_COLOR: "1"
    };

    Object.keys(railpackEnv).forEach((key) => {
      if (!railpackEnv[key]) {
        delete railpackEnv[key];
      }
    });

    await runCommand(
      "railpack",
      ["build", "--name", imageTag, "--progress", "plain", "--cache-key", service.id, appDir],
      deployment.id,
      { env: railpackEnv, redact: secrets }
    );

    await runCommand("docker", ["rm", "-f", containerName], deployment.id).catch(() => {
      appendDeploymentLog(deployment.id, `No previous container named ${containerName} was running.`);
    });

    const dockerArgs = ["run", "-d", "--restart", "unless-stopped", "--name", containerName, "-p", `127.0.0.1:${service.hostPort}:${service.internalPort}`];
    for (const [key, value] of Object.entries({ ...env, PORT: String(service.internalPort) })) {
      dockerArgs.push("--env", `${key}=${value}`);
    }
    dockerArgs.push(imageTag);

    await runCommand("docker", dockerArgs, deployment.id, { redact: secrets });

    db.update(deployments).set({ status: "running", finishedAt: now() }).where(eq(deployments.id, deployment.id)).run();
    db.update(services)
      .set({ status: "active", lastDeployedAt: now(), updatedAt: now() })
      .where(eq(services.id, service.id))
      .run();

    const caddy = await writeAndReloadCaddy();
    appendDeploymentLog(deployment.id, caddy.ok ? "Caddy config reloaded." : `Caddy reload skipped/failed: ${caddy.detail}`);
    appendDeploymentLog(deployment.id, `Deployment is running on 127.0.0.1:${service.hostPort}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown deployment error";
    appendDeploymentLog(deployment.id, `Deployment failed: ${message}`, "stderr", secrets);
    db.update(deployments).set({ status: "failed", finishedAt: now() }).where(eq(deployments.id, deployment.id)).run();
    db.update(services).set({ status: "failed", updatedAt: now() }).where(eq(services.id, service.id)).run();
  }
}

async function tickWorker() {
  if (workerActive) {
    return;
  }

  const queued = db
    .select()
    .from(deployments)
    .where(inArray(deployments.status, ["queued"]))
    .orderBy(desc(deployments.createdAt))
    .limit(1)
    .get();

  if (!queued) {
    return;
  }

  const service = getServiceById(queued.serviceId);
  if (!service) {
    db.update(deployments).set({ status: "failed", finishedAt: now() }).where(eq(deployments.id, queued.id)).run();
    appendDeploymentLog(queued.id, "Deployment failed: service no longer exists.", "stderr");
    return;
  }

  workerActive = true;
  try {
    await runDeployment(queued, service);
  } finally {
    workerActive = false;
  }
}

export function startDeployWorker() {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  sqlite
    .prepare("UPDATE deployments SET status = 'failed', finished_at = ? WHERE status IN ('building')")
    .run(now());
  setInterval(() => {
    void tickWorker();
  }, 2000);
  void tickWorker();
}
