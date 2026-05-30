import { spawn } from "node:child_process";
import net from "node:net";
import { config } from "./config.js";

export type ToolCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

function checkCommand(command: string, args: string[] = ["--version"]): Promise<ToolCheck> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ name: command, ok: false, detail: error.message });
    });
    child.on("close", (code) => {
      const detail = output.trim().split("\n")[0] || `exited with ${code}`;
      resolve({ name: command, ok: code === 0, detail });
    });
  });
}

function parseTcpTarget(address: string) {
  const match = address.match(/^tcp:\/\/([^:/]+):(\d+)$/i);
  if (!match) return null;
  return { host: match[1], port: Number(match[2]) };
}

function checkTcpReachability(name: string, address: string, timeoutMs = 500): Promise<ToolCheck> {
  const target = parseTcpTarget(address);
  if (!target) {
    return Promise.resolve({
      name,
      ok: false,
      detail: `Unsupported address: ${address}`
    });
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ name, ok, detail });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true, `${target.host}:${target.port} reachable`));
    socket.once("timeout", () => finish(false, `${target.host}:${target.port} timed out`));
    socket.once("error", (error: Error) => finish(false, error.message));
    socket.connect(target.port, target.host);
  });
}

async function checkCaddy() {
  const binary = await checkCommand("caddy");
  if (binary.ok) return binary;

  const container = await checkCommand("docker", ["inspect", "-f", "{{.State.Status}}", "deploy-caddy"]);
  if (container.ok && container.detail === "running") {
    return { name: "caddy", ok: true, detail: "deploy-caddy container running" };
  }

  return {
    name: "caddy",
    ok: false,
    detail: `caddy binary unavailable; deploy-caddy ${container.detail}`
  };
}

function checkDocker() {
  return checkCommand("docker", ["version", "--format", "client {{.Client.Version}} / server {{.Server.Version}}"]);
}

export async function getSystemChecks() {
  const [git, docker, railpack, buildkit, caddy] = await Promise.all([
    checkCommand("git"),
    checkDocker(),
    checkCommand("railpack"),
    checkTcpReachability("buildkit", config.buildkitHost),
    checkCaddy()
  ]);

  return { tools: [git, docker, railpack, buildkit, caddy] };
}
