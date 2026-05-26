import { FieldLabel, FormInput } from "../ui/primitives";
import { DatabasePublicAccessFields } from "./database-public-access-fields";

export type DatabaseSettingsState = {
  name: string;
  internalPort: number;
  databasePublicEnabled: boolean;
  databasePublicHostname: string;
};

type DatabaseServiceSettingsPanelProps = {
  settings: DatabaseSettingsState;
  hostPort?: number;
  onChange: (settings: DatabaseSettingsState) => void;
};

export function DatabaseServiceSettingsPanel({ settings, hostPort, onChange }: DatabaseServiceSettingsPanelProps) {
  return (
    <>
      <div>
        <FieldLabel>Service name</FieldLabel>
        <FormInput value={settings.name} onChange={(event) => onChange({ ...settings, name: event.target.value })} />
      </div>
      <div>
        <FieldLabel>Database port (Internal)</FieldLabel>
        <FormInput
          type="number"
          value={settings.internalPort}
          onChange={(event) => onChange({ ...settings, internalPort: Number(event.target.value) })}
        />
      </div>
      <div className="xl:col-span-2">
        <DatabasePublicAccessFields
          enabled={settings.databasePublicEnabled}
          hostname={settings.databasePublicHostname}
          hostPort={hostPort}
          redeployHint
          onEnabledChange={(enabled) => onChange({ ...settings, databasePublicEnabled: enabled })}
          onHostnameChange={(hostname) => onChange({ ...settings, databasePublicHostname: hostname })}
        />
      </div>
    </>
  );
}
