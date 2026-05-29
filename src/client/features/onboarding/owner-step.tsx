import type { OnboardingForm } from "./onboarding-types";
import { OnboardingSection, TextField } from "./onboarding-fields";

export function OwnerStep({
  form,
  update
}: {
  form: OnboardingForm;
  update: (patch: Partial<OnboardingForm>) => void;
}) {
  return (
    <OnboardingSection
      eyebrow="Step 01"
      title="Create owner access"
      description="This first account controls the instance, deployment actions, stored secrets, backups, and future user management."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Name" value={form.ownerName} onChange={(ownerName) => update({ ownerName })} required autoComplete="name" />
        <TextField label="Email" value={form.ownerEmail} onChange={(ownerEmail) => update({ ownerEmail })} type="email" required autoComplete="email" />
        <TextField
          label="Password"
          value={form.ownerPassword}
          onChange={(ownerPassword) => update({ ownerPassword })}
          type="password"
          required
          autoComplete="new-password"
        />
        <TextField
          label="Confirm password"
          value={form.ownerPasswordConfirm}
          onChange={(ownerPasswordConfirm) => update({ ownerPasswordConfirm })}
          type="password"
          required
          autoComplete="new-password"
        />
      </div>
    </OnboardingSection>
  );
}
