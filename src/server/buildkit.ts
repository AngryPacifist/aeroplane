import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

const containerName = "deploy-buildkit";
const containerPort = 1234;
const imageName = "moby/buildkit:latest";
const dockerCandidates = [
  process.env.DOCKER_CLI,
  "docker",
  "/usr/bin/docker",
  "/usr/local/bin/docker",
  "/opt/homebrew/bin/docker",
  "/Applications/Docker.app/Contents/Resources/bin/docker"
].filter(Boolean) as string[];

type TcpTarget = {
  host: string;
  port: number;
};

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

export type BuildkitRecoveryResult = {
  ok: boolean;
  detail: string;
  recovered: boolean;
};

export function parseTcpTarget(address: string): TcpTarget | null {
  const match = address.match(/^tcp:\/\/([^:/]+):(\d+)$/i);
  if (!match) return null;
  return { host: match[1], port: Number(match[2]) };
}

export function isBuildkitReachable(address: string, timeoutMs = 600) {
  const target = parseTcpTarget(address);
  if (!target) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolvePromise) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(target.port, target.host);
  });
}

export function buildkitStartHint() {
  return `docker run -d --restart unless-stopped --privileged --name ${containerName} -p 127.0.0.1:${containerPort}:${containerPort} ${imageName} --addr tcp://0.0.0.0:${containerPort}`;
}

function runBufferedCommand(command: string, args: string[], timeoutMs = 30000): Promise<CommandResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      stderr = stderr || `Timed out after ${timeoutMs}ms`;
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolvePromise({ code: 1, stdout, stderr: stderr || error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

async function dockerCommand() {
  const errors: string[] = [];
  for (const command of dockerCandidates) {
    const result = await runBufferedCommand(command, ["version", "--format", "{{.Server.Version}}"], 10000);
    if (result.code === 0) return { command, error: "" };
    errors.push(`${command}: ${(result.stderr || result.stdout).trim() || `exited with ${result.code}`}`);
  }
  return { command: "docker", error: errors.join("; ") };
}

function localBuildkitTarget(target: TcpTarget) {
  return target.host === "localhost" || target.host === "127.0.0.1" || target.host === "0.0.0.0";
}

function composeFiles() {
  const candidates = [
    process.env.AEROPLANE_INSTALL_DIR ? resolve(process.env.AEROPLANE_INSTALL_DIR, "compose.yml") : "",
    resolve(process.cwd(), "compose.yml"),
    resolve(process.cwd(), "docker-compose.yml")
  ];
  return candidates.filter((filePath, index) => filePath && candidates.indexOf(filePath) === index && existsSync(filePath));
}

async function waitForBuildkit(address: string, timeoutMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isBuildkitReachable(address, 750)) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 350));
  }
  return false;
}

async function startWithCompose(docker: string, address: string) {
  for (const filePath of composeFiles()) {
    const result = await runBufferedCommand(docker, ["compose", "-f", filePath, "up", "-d", "buildkit"]);
    if (result.code === 0 && await waitForBuildkit(address)) {
      return { ok: true, recovered: true, detail: `Started BuildKit with ${filePath}.` };
    }
  }
  return null;
}

async function startExistingContainer(docker: string, address: string) {
  const inspect = await runBufferedCommand(docker, ["inspect", "-f", "{{.State.Status}}", containerName]);
  if (inspect.code !== 0) return null;

  const update = await runBufferedCommand(docker, ["update", "--restart", "unless-stopped", containerName]);
  if (update.code !== 0) return { ok: false, recovered: false, detail: update.stderr.trim() || `docker update ${containerName} failed` };

  const status = inspect.stdout.trim();
  if (status === "running") {
    const restart = await runBufferedCommand(docker, ["restart", containerName]);
    if (restart.code !== 0) return { ok: false, recovered: false, detail: restart.stderr.trim() || `docker restart ${containerName} failed` };
  } else {
    const start = await runBufferedCommand(docker, ["start", containerName]);
    if (start.code !== 0) return { ok: false, recovered: false, detail: start.stderr.trim() || `docker start ${containerName} failed` };
  }

  if (await waitForBuildkit(address)) return { ok: true, recovered: true, detail: `Started BuildKit container ${containerName}.` };
  return { ok: false, recovered: false, detail: `Container ${containerName} started, but ${address} is still unreachable.` };
}

async function createContainer(docker: string, address: string, target: TcpTarget) {
  const result = await runBufferedCommand(docker, [
    "run",
    "-d",
    "--restart",
    "unless-stopped",
    "--privileged",
    "--name",
    containerName,
    "-p",
    `127.0.0.1:${target.port}:${containerPort}`,
    imageName,
    "--addr",
    `tcp://0.0.0.0:${containerPort}`
  ]);
  if (result.code !== 0) return { ok: false, recovered: false, detail: result.stderr.trim() || `docker run ${containerName} failed` };
  if (await waitForBuildkit(address)) return { ok: true, recovered: true, detail: `Created BuildKit container ${containerName}.` };
  return { ok: false, recovered: false, detail: `Created ${containerName}, but ${address} is still unreachable.` };
}

export async function ensureBuildkitRunning(address: string): Promise<BuildkitRecoveryResult> {
  if (await isBuildkitReachable(address)) {
    return { ok: true, recovered: false, detail: `BuildKit is reachable at ${address}.` };
  }

  const target = parseTcpTarget(address);
  if (!target) return { ok: false, recovered: false, detail: `Unsupported BuildKit address: ${address}` };
  if (!localBuildkitTarget(target)) {
    return { ok: false, recovered: false, detail: `BuildKit is remote at ${address}; automatic local recovery was skipped.` };
  }

  const docker = await dockerCommand();
  if (docker.error) return { ok: false, recovered: false, detail: `Docker is unavailable: ${docker.error}` };

  const compose = await startWithCompose(docker.command, address);
  if (compose?.ok) return compose;

  const existing = await startExistingContainer(docker.command, address);
  if (existing?.ok) return existing;
  if (existing && !existing.ok) return existing;

  return createContainer(docker.command, address, target);
}
