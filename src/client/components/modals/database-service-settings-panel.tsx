import { useEffect, useState } from "react";
import { api } from "../../api";
import { FieldLabel, FormInput } from "../ui/primitives";
import { generateDatabaseHostname } from "./database-hostname";
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
  const [rootDomain, setRootDomain] = useState("");
  const generatedHostname = generateDatabaseHostname(settings.name, rootDomain);

  useEffect(() => {
    let cancelled = false;
    void api.systemSettings()
      .then((result) => {
        if (!cancelled) setRootDomain(result.settings.rootDomain);
      })
      .catch(() => {
        if (!cancelled) setRootDomain("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings.databasePublicEnabled || !generatedHostname || settings.databasePublicHostname === generatedHostname) return;
    onChange({ ...settings, databasePublicHostname: generatedHostname });
  }, [generatedHostname, settings, onChange]);

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
          rootDomain={rootDomain}
          redeployHint
          onEnabledChange={(enabled) => onChange({
            ...settings,
            databasePublicEnabled: enabled,
            databasePublicHostname: enabled ? generatedHostname : ""
          })}
        />
      </div>
    </>
  );
}
