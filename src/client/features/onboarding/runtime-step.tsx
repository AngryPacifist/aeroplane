import type { OnboardingForm } from "./onboarding-types";
import { OnboardingSection, TextField, ToggleField } from "./onboarding-fields";

export function RuntimeStep({
  form,
  update
}: {
  form: OnboardingForm;
  update: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <OnboardingSection
      eyebrow="Step 02"
      title="Runtime environment"
      description="Aeroplane writes these to .env.local. Most values apply after restart, while the secret key is also used immediately for encrypted settings."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="AEROPLANE_SECRET_KEY" value={form.secretKey} onChange={(secretKey) => update({ secretKey })} placeholder="Generated if blank" />
        <TextField label="DATA_DIR" value={form.dataDir} onChange={(dataDir) => update({ dataDir })} required />
        <TextField label="PUBLIC_URL" value={form.publicUrl} onChange={(publicUrl) => update({ publicUrl })} required />
        <TextField label="PORT" value={form.port} onChange={(port) => update({ port })} type="number" required />
        <TextField label="BUILDKIT_HOST" value={form.buildkitHost} onChange={(buildkitHost) => update({ buildkitHost })} required />
        <TextField label="AEROPLANE_RUNTIME_NETWORK" value={form.runtimeNetworkName} onChange={(runtimeNetworkName) => update({ runtimeNetworkName })} required />
        <TextField label="CADDY_CONFIG_PATH" value={form.caddyConfigPath} onChange={(caddyConfigPath) => update({ caddyConfigPath })} required />
        <TextField label="CADDY_DATA_DIR" value={form.caddyDataDir} onChange={(caddyDataDir) => update({ caddyDataDir })} required />
        <TextField label="CADDY_RELOAD_CMD" value={form.caddyReloadCmd} onChange={(caddyReloadCmd) => update({ caddyReloadCmd })} required />
        <div className="md:col-span-2">
          <ToggleField
            label="DEPLOY_DRY_RUN"
            checked={form.deployDryRun}
            onChange={(deployDryRun) => update({ deployDryRun })}
            description="Keep this off for real deployments. Turn it on only when rehearsing a host setup."
          />
        </div>
      </div>
    </OnboardingSection>
  );
}
