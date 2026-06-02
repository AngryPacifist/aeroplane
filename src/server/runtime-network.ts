import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { config } from "./config.js";
import { db } from "./db.js";
import { services, type Service } from "./schema.js";

type DockerCommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

type RunDocker = (args: string[]) => Promise<unknown>;
type RunBufferedDocker = (args: string[]) => Promise<DockerCommandResult>;
type RuntimeNetworkService = Pick<Service, "id" | "projectId" | "slug">;

type ContainerInspect = {
  State?: {
    Running?: boolean;
  };
  NetworkSettings?: {
    Networks?: Record<string, unknown>;
  };
};

const maxDockerNetworkNameLength = 63;

function safeDockerNetworkPart(value: string, fallback: string) {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "") || fallback;
}

function compactDockerNetworkName(value: string) {
  if (value.length <= maxDockerNetworkNameLength) return value;

  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  const prefixLength = maxDockerNetworkNameLength - hash.length - 1;
  const prefix = value.slice(0, prefixLength).replace(/[_.-]+$/g, "") || "network";
  return `${prefix}-${hash}`;
}

export function runtimeNetworkNameForProject(projectId: string) {
  const baseName = safeDockerNetworkPart(config.runtimeNetworkName, "aeroplane-runtime");
  const projectName = safeDockerNetworkPart(projectId, "project");
  return compactDockerNetworkName(`${baseName}-${projectName}`);
}

export function runtimeNetworkNameForService(service: Pick<Service, "projectId">) {
  return runtimeNetworkNameForProject(service.projectId);
}

export function runtimeNetworkArgs(service: Pick<Service, "projectId" | "slug">) {
  return ["--network", runtimeNetworkNameForService(service), "--network-alias", service.slug];
}

function parseContainerInspect(stdout: string): ContainerInspect | null {
  try {
    const parsed = JSON.parse(stdout) as ContainerInspect[];
    return parsed[0] ?? null;
  } catch {
    return null;
  }
}

async function inspectContainer(containerName: string, runBufferedDocker: RunBufferedDocker) {
  const inspected = await runBufferedDocker(["inspect", containerName]);
  if (inspected.code !== 0) return null;
  return parseContainerInspect(inspected.stdout);
}

async function connectContainerToRuntimeNetwork({
  networkName,
  service,
  containerName,
  runDocker,
  runBufferedDocker,
  log
}: {
  networkName: string;
  service: RuntimeNetworkService;
  containerName: string;
  runDocker: RunDocker;
  runBufferedDocker: RunBufferedDocker;
  log?: (line: string) => void;
}) {
  const container = await inspectContainer(containerName, runBufferedDocker);
  if (!container?.State?.Running) return;

  const networks = container.NetworkSettings?.Networks ?? {};
  if (networks[networkName]) return;

  try {
    await runDocker(["network", "connect", "--alias", service.slug, networkName, containerName]);
    log?.(`Connected existing container ${containerName} to project runtime network ${networkName}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Docker network connect failed";
    log?.(`Could not connect existing container ${containerName} to project runtime network ${networkName}: ${message}`);
  }
}

async function connectProjectContainersToRuntimeNetwork({
  projectId,
  networkName,
  containerNameForService,
  runDocker,
  runBufferedDocker,
  log
}: {
  projectId: string;
  networkName: string;
  containerNameForService: (serviceId: string) => string;
  runDocker: RunDocker;
  runBufferedDocker: RunBufferedDocker;
  log?: (line: string) => void;
}) {
  const projectServices = db.select().from(services).where(eq(services.projectId, projectId)).all();
  for (const projectService of projectServices) {
    await connectContainerToRuntimeNetwork({
      networkName,
      service: projectService,
      containerName: containerNameForService(projectService.id),
      runDocker,
      runBufferedDocker,
      log
    });
  }
}

export async function ensureProjectRuntimeNetwork({
  service,
  containerNameForService,
  runDocker,
  runBufferedDocker,
  log
}: {
  service: RuntimeNetworkService;
  containerNameForService: (serviceId: string) => string;
  runDocker: RunDocker;
  runBufferedDocker: RunBufferedDocker;
  log?: (line: string) => void;
}) {
  const networkName = runtimeNetworkNameForService(service);
  const existing = await runBufferedDocker(["network", "inspect", networkName]);
  if (existing.code !== 0) {
    log?.(`Creating Docker project runtime network ${networkName}.`);
    await runDocker(["network", "create", networkName]);
  }

  await connectProjectContainersToRuntimeNetwork({
    projectId: service.projectId,
    networkName,
    containerNameForService,
    runDocker,
    runBufferedDocker,
    log
  });

  return networkName;
}
