import { ReactNode } from "react";
import { Checkbox } from "../../components/ui/checkbox";
import { FieldLabel, FormInput } from "../../components/ui/primitives";

export function OnboardingSection({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#4FB8B2]">{eyebrow}</div>
        <h2 className="mt-1 font-hero text-lg tracking-tight text-zinc-100">{title}</h2>
        <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  autoComplete
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <FormInput
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full resize-y border border-zinc-700 bg-zinc-900 px-3 py-3 font-mono text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#4FB8B2]/60"
        spellCheck={false}
      />
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  description
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <Checkbox checked={checked} label={label} onChange={onChange} className="items-start">
      <span>
        <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200">{label}</span>
        {description ? <span className="mt-1 block font-mono text-xs leading-relaxed text-zinc-500">{description}</span> : null}
      </span>
    </Checkbox>
  );
}
