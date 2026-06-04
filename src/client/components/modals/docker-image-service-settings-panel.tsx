import { PackageIcon } from "@hugeicons/core-free-icons";
import { useMemo } from "react";
import { validateDockerImageReference } from "../../../shared/service-source";
import { AppIcon, FieldLabel, FormInput, SectionTitle } from "../ui/primitives";

type DockerImageServiceSettings = {
  name: string;
  dockerImage: string;
  internalPort: number;
};

export function DockerImageServiceSettingsPanel({
  settings,
  hostPort,
  onChange
}: {
  settings: DockerImageServiceSettings;
  hostPort?: number;
  onChange: (settings: Partial<DockerImageServiceSettings>) => void;
}) {
  const imageValidation = useMemo(() => validateDockerImageReference(settings.dockerImage), [settings.dockerImage]);

  return (
    <>
      <div className="xl:col-span-2">
        <SectionTitle icon={PackageIcon} title="Docker Image" meta="Run a prebuilt container image" />
      </div>
      <div>
        <FieldLabel>Service name</FieldLabel>
        <FormInput value={settings.name} onChange={(event) => onChange({ name: event.target.value })} required />
      </div>
      <div>
        <FieldLabel>Internal port</FieldLabel>
        <FormInput
          type="number"
          min={1}
          max={65535}
          value={settings.internalPort}
          onChange={(event) => onChange({ internalPort: Number(event.target.value) })}
          required
        />
        {hostPort ? <p className="mt-2 text-xs text-zinc-500">Traffic is routed through host port {hostPort}.</p> : null}
      </div>
      <div className="xl:col-span-2">
        <FieldLabel>Image reference</FieldLabel>
        <div className="flex items-center gap-3 border border-zinc-700 bg-zinc-900/88 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-zinc-800 bg-zinc-950 text-zinc-300">
            <AppIcon icon={PackageIcon} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <FormInput value={settings.dockerImage} onChange={(event) => onChange({ dockerImage: event.target.value })} placeholder="ghcr.io/org/app:latest" required />
            {settings.dockerImage.trim() && !imageValidation.ok ? (
              <p className="mt-2 text-xs text-rose-300">{imageValidation.error}</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Private images use the host Docker daemon's registry login.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
