import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { Deployment, DeploymentLog } from "../../api";
import { AppIcon, StatusPill, deploymentCardClass, shellButton } from "../../components/ui/primitives";
import { formatTime, shortSha } from "../../lib/format";
import { DeploymentLogsPanel } from "./service-log-panels";
import { formatBuildDuration } from "./service-format";

export function ServiceDeploymentsPanel({
  deployments,
  activeDeployment,
  activeDeploymentId,
  deploymentLogs,
  activeDeploymentDuration,
  busy,
  nowMs,
  onSelectDeployment,
  onAbortActiveDeployment
}: {
  deployments: Deployment[];
  activeDeployment: Deployment | null;
  activeDeploymentId: string | null;
  deploymentLogs: DeploymentLog[];
  activeDeploymentDuration: string | null;
  busy: string;
  nowMs: number;
  onSelectDeployment: (deploymentId: string) => void;
  onAbortActiveDeployment: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
      <div className="min-h-0 overflow-y-auto pr-1 lg:w-[340px] lg:flex-none">
        <div className="space-y-3">
          {deployments.map((deployment) => {
            const displayStatus = deployment.status === "running" ? "deployed" : deployment.status;
            return (
              <button
                key={deployment.id}
                type="button"
                className={`flex w-full items-center justify-between border px-4 py-3 text-left ${deploymentCardClass(
                  displayStatus,
                  deployment.id === activeDeploymentId
                )}`}
                onClick={() => onSelectDeployment(deployment.id)}
              >
                <div>
                  <div className="text-sm font-medium">{shortSha(deployment.commitSha)}</div>
                  <div
                    className={`mt-1 text-xs ${
                      deployment.id === activeDeploymentId
                        ? displayStatus === "failed"
                          ? "text-red-700"
                          : displayStatus === "building" || displayStatus === "queued"
                            ? "text-amber-700"
                            : displayStatus === "active" || displayStatus === "deployed"
                              ? "text-emerald-700"
                              : displayStatus === "superseded"
                                ? "text-zinc-400"
                                : "text-zinc-300"
                        : "text-zinc-400"
                    }`}
                  >
                    {formatTime(deployment.createdAt)}
                    {deployment.status === "queued" || deployment.status === "building"
                      ? ` • ${formatBuildDuration(deployment.startedAt ?? deployment.createdAt, deployment.finishedAt, nowMs) ?? "0s"}`
                      : ""}
                  </div>
                </div>
                <StatusPill status={displayStatus} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <DeploymentLogsPanel
          logs={deploymentLogs}
          title="Deploy output"
          meta={
            activeDeploymentDuration
              ? `${activeDeployment?.status === "queued" ? "Queued for" : "Building for"} ${activeDeploymentDuration}`
              : undefined
          }
          actions={
            activeDeployment && (activeDeployment.status === "queued" || activeDeployment.status === "building") ? (
              <button type="button" className={shellButton("ghost")} onClick={onAbortActiveDeployment} disabled={busy === "abort"}>
                <AppIcon icon={Cancel01Icon} size={15} />
                Abort build
              </button>
            ) : undefined
          }
          emptyLabel="Choose a deployment to inspect its build and deploy logs."
        />
      </div>
    </div>
  );
}
