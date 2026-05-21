import { GithubIcon } from "@hugeicons/core-free-icons";
import type { GitHubStatus } from "../../api";
import { ModalShell } from "../../components/modals/modal-shell";
import { AppIcon, shellButton } from "../../components/ui/primitives";

export function GitHubInstallModal({
  open,
  status,
  onClose
}: {
  open: boolean;
  status: null | GitHubStatus;
  onClose: () => void;
}) {
  if (!open || !status || status.mode !== "app" || status.installed || !status.installUrl) {
    return null;
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      icon={GithubIcon}
      title="Install GitHub App"
      meta="Connect the app to at least one repository before creating a service."
      width="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
          The server is configured, but the GitHub App is not installed on any repositories yet. Install it once, then new services can browse repos, pick branches, and choose deployment directories directly.
        </div>
        <div className="flex justify-end">
          <a href={status.installUrl} target="_blank" rel="noreferrer" className={shellButton("primary")}>
            <AppIcon icon={GithubIcon} size={16} />
            Install GitHub App
          </a>
        </div>
      </div>
    </ModalShell>
  );
}
