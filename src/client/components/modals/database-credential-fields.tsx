import { FieldLabel, FormInput } from "../ui/primitives";
import { getDatabaseCredentialFields, type DatabaseType, type EnvEntry } from "./database-service-options";

type DatabaseCredentialFieldsProps = {
  dbType: DatabaseType;
  entries: EnvEntry[];
  disabled?: boolean;
  onChange: (key: string, value: string) => void;
};

export function DatabaseCredentialFields({ dbType, entries, disabled, onChange }: DatabaseCredentialFieldsProps) {
  const fields = getDatabaseCredentialFields(dbType);

  function valueFor(key: string) {
    return entries.find((entry) => entry.key === key)?.value ?? "";
  }

  return (
    <div className="space-y-3">
      <div className="border-b border-zinc-800 pb-2">
        <span className="text-sm font-medium text-zinc-100">Database details</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key}>
            <FieldLabel>{field.label}</FieldLabel>
            <FormInput
              value={valueFor(field.key)}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
