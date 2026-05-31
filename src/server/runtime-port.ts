import type { Service } from "./schema.js";

export function runtimePortForService(service: Service, env: Record<string, string>) {
  const envPort = Number(env.PORT);
  if (Number.isInteger(envPort) && envPort > 0 && envPort <= 65535) {
    return envPort;
  }

  return service.internalPort;
}
