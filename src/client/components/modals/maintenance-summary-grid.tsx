import type { SystemMaintenanceInfo } from "../../api";
import { formatBytes } from "../../lib/format";
import { MaintenanceUsageBar } from "./maintenance-usage-bar";
import { diskTone, dockerReclaimableDetail, dockerReclaimablePercent, pathMetric } from "./maintenance-utils";

export function MaintenanceSummaryGrid({ info, loading }: { info: SystemMaintenanceInfo | null; loading: boolean }) {
  const diskPercent = info?.disk?.usedPercent ?? 0;
  const buildPath = pathMetric(info, "build-artifacts");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MaintenanceUsageBar
        label="Root disk free"
        value={info?.disk ? formatBytes(info.disk.availableBytes) : loading ? "Loading" : "Unknown"}
        detail={info?.disk ? `${formatBytes(info.disk.usedBytes)} used of ${formatBytes(info.disk.totalBytes)} on ${info.disk.mount}.` : "Measured from the VPS root filesystem."}
        percent={diskPercent}
        percentLabel={`${Math.round(diskPercent)}% used`}
        tone={diskTone(diskPercent)}
      />
      <MaintenanceUsageBar
        label="Docker cleanup candidates"
        value={formatBytes(info?.docker.reclaimableBytes ?? null)}
        detail={dockerReclaimableDetail(info)}
        percent={dockerReclaimablePercent(info)}
        percentLabel={`${Math.round(dockerReclaimablePercent(info))}% of disk`}
        tone={info?.docker.reclaimableBytes && info.docker.reclaimableBytes > 3 * 1000 ** 3 ? "amber" : "teal"}
      />
      <MaintenanceUsageBar
        label="Build artifacts"
        value={formatBytes(buildPath?.bytes ?? null)}
        detail={buildPath?.available ? "Old source checkouts and build workspaces." : "No build artifact directory yet."}
        percent={info?.disk && buildPath?.bytes ? Math.min(100, (buildPath.bytes / info.disk.totalBytes) * 100) : 0}
        percentLabel={info?.disk && buildPath?.bytes ? `${Math.round(Math.min(100, (buildPath.bytes / info.disk.totalBytes) * 100))}% of disk` : "0%"}
        tone={buildPath?.bytes && buildPath.bytes > 2 * 1000 ** 3 ? "amber" : "teal"}
      />
    </div>
  );
}
