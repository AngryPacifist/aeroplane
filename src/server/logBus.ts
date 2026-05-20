import type { DeploymentLog } from "./schema.js";

type Listener = (log: DeploymentLog) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeToDeploymentLogs(deploymentId: string, listener: Listener) {
  const existing = listeners.get(deploymentId) ?? new Set<Listener>();
  existing.add(listener);
  listeners.set(deploymentId, existing);

  return () => {
    existing.delete(listener);
    if (existing.size === 0) {
      listeners.delete(deploymentId);
    }
  };
}

export function publishDeploymentLog(log: DeploymentLog) {
  const deploymentListeners = listeners.get(log.deploymentId);
  if (!deploymentListeners) {
    return;
  }

  for (const listener of deploymentListeners) {
    listener(log);
  }
}
