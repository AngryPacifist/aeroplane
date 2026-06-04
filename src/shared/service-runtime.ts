export const serviceRuntimeModes = ["web", "worker"] as const;

export type ServiceRuntimeMode = (typeof serviceRuntimeModes)[number];

export function normalizeServiceRuntimeMode(value: unknown): ServiceRuntimeMode {
  return value === "worker" ? "worker" : "web";
}

export function isWorkerService(service: { runtimeMode?: string | null }) {
  return normalizeServiceRuntimeMode(service.runtimeMode) === "worker";
}
