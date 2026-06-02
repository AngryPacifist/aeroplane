export function railpackBuildEnv(serviceEnv: Record<string, string>, runtimePort: number) {
  return {
    ...serviceEnv,
    PORT: String(runtimePort)
  };
}

export function railpackBuildEnvArgs(buildEnv: Record<string, string>) {
  return Object.entries(buildEnv).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
}
