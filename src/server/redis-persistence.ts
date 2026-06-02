type BufferedDockerResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

type ContainerState = {
  running: boolean;
  restarting: boolean;
};

type RedisPersistenceOptions = {
  containerName: string;
  password?: string;
  getContainerState: (containerName: string) => Promise<ContainerState | null>;
  runDocker: (args: string[]) => Promise<void>;
  runBufferedDocker: (args: string[]) => Promise<BufferedDockerResult>;
  log?: (line: string) => void;
  warn?: (line: string) => void;
};

function resultText(result: BufferedDockerResult) {
  return (result.stderr || result.stdout || "Redis command failed").trim();
}

function redisNeedsPassword(text: string) {
  return text.toLowerCase().includes("noauth");
}

async function runRedisSave({ containerName, password, runBufferedDocker, warn }: RedisPersistenceOptions) {
  const unauthenticated = await runBufferedDocker([
    "exec",
    containerName,
    "redis-cli",
    "--no-auth-warning",
    "SAVE"
  ]);
  if (unauthenticated.code === 0) return;

  const unauthenticatedText = resultText(unauthenticated);
  if (password && redisNeedsPassword(unauthenticatedText)) {
    const authenticated = await runBufferedDocker([
      "exec",
      containerName,
      "redis-cli",
      "--no-auth-warning",
      "-a",
      password,
      "SAVE"
    ]);
    if (authenticated.code === 0) return;

    warn?.(`Redis SAVE failed before replacement: ${resultText(authenticated)}`);
    return;
  }

  warn?.(`Redis SAVE failed before replacement: ${unauthenticatedText}`);
}

export async function saveRedisDatasetIfRunning(options: RedisPersistenceOptions) {
  const state = await options.getContainerState(options.containerName);
  if (!state?.running && !state?.restarting) return false;

  options.log?.(`Saving Redis dataset before replacing ${options.containerName}.`);
  await runRedisSave(options);
  return true;
}

export async function stopRedisContainerForReplacement(options: RedisPersistenceOptions) {
  const state = await options.getContainerState(options.containerName);
  if (!state) return false;

  if (state.running || state.restarting) {
    await saveRedisDatasetIfRunning(options);
    options.log?.(`Gracefully stopping Redis container ${options.containerName} before replacement.`);
    await options.runDocker(["stop", "--time", "30", options.containerName]);
  }

  return true;
}
