import { spawn } from "node:child_process";

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

export async function getSystemChecks() {
  const [git, docker, railpack, caddy] = await Promise.all([
    checkCommand("git"),
    checkCommand("docker"),
    checkCommand("railpack"),
    checkCommand("caddy")
  ]);

  return { tools: [git, docker, railpack, caddy] };
}
