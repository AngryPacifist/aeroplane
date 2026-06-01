import type { Service } from "./schema.js";
import {
  databaseDataMountCandidates,
  databaseDataVolumeName,
  databaseVolumeHelperImage
} from "./database-runtime.js";

export type BufferedDockerResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

type DockerMount = {
  Type?: string;
  Name?: string;
  Source?: string;
  Destination?: string;
};

type EnsureDatabaseDataVolumeOptions = {
  service: Service;
  dbType: string;
  existingContainerName: string;
  runDocker: (args: string[]) => Promise<void>;
  runBufferedDocker: (args: string[]) => Promise<BufferedDockerResult>;
  log?: (line: string) => void;
};

async function inspectContainerMounts(existingContainerName: string, runBufferedDocker: (args: string[]) => Promise<BufferedDockerResult>) {
  const result = await runBufferedDocker(["inspect", "--format", "{{json .Mounts}}", existingContainerName]);
  if (result.code !== 0) return [];

  try {
    return JSON.parse(result.stdout.trim()) as DockerMount[];
  } catch {
    return [];
  }
}

function sourceVolumeArg(mount: DockerMount) {
  if (mount.Type === "volume" && mount.Name) return `${mount.Name}:/src:ro`;
  if (mount.Source) return `${mount.Source}:/src:ro`;
  return null;
}

async function dockerVolumeIsEmpty(volumeName: string, runBufferedDocker: (args: string[]) => Promise<BufferedDockerResult>) {
  const result = await runBufferedDocker([
    "run",
    "--rm",
    "-v",
    `${volumeName}:/dst`,
    databaseVolumeHelperImage,
    "sh",
    "-lc",
    `[ -z "$(find /dst -mindepth 1 -maxdepth 1 -print -quit)" ]`
  ]);
  if (result.code === 0) return true;
  if (result.code === 1) return false;
  throw new Error((result.stderr || result.stdout || "Could not inspect database data volume").trim());
}

export async function ensureStableDatabaseDataVolume({
  service,
  dbType,
  existingContainerName,
  runDocker,
  runBufferedDocker,
  log
}: EnsureDatabaseDataVolumeOptions) {
  const stableVolume = databaseDataVolumeName(service.id);
  log?.(`Ensuring stable database data volume ${stableVolume}.`);
  await runDocker([
    "volume",
    "create",
    "--label",
    "aeroplane.kind=database-data",
    "--label",
    `aeroplane.service-id=${service.id}`,
    "--label",
    `aeroplane.service-slug=${service.slug}`,
    stableVolume
  ]);

  const mounts = await inspectContainerMounts(existingContainerName, runBufferedDocker);
  const dataMount = mounts.find((mount) => databaseDataMountCandidates(dbType).includes(mount.Destination ?? ""));
  if (!dataMount) return;

  const sourceArg = sourceVolumeArg(dataMount);
  if (!sourceArg || dataMount.Name === stableVolume) return;

  const stableIsEmpty = await dockerVolumeIsEmpty(stableVolume, runBufferedDocker);
  if (!stableIsEmpty) {
    log?.(`Stable database data volume ${stableVolume} already contains data; keeping it.`);
    return;
  }

  log?.(`Stopping existing database container ${existingContainerName} before adopting its data volume.`);
  await runDocker(["stop", existingContainerName]);
  log?.(`Adopting existing database data from Docker volume ${dataMount.Name ?? dataMount.Source ?? "unknown"}.`);
  try {
    await runDocker([
      "run",
      "--rm",
      "-v",
      sourceArg,
      "-v",
      `${stableVolume}:/dst`,
      databaseVolumeHelperImage,
      "sh",
      "-lc",
      `set -eu; [ -z "$(find /dst -mindepth 1 -maxdepth 1 -print -quit)" ]; cd /src; tar cf - . | tar xpf - -C /dst`
    ]);
  } catch (error) {
    log?.(`Database data adoption failed; restarting existing container ${existingContainerName}.`);
    await runDocker(["start", existingContainerName]).catch(() => undefined);
    throw error;
  }
}
