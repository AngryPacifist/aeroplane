import { createRootRoute } from "@tanstack/react-router";
import { RootShell } from "../components/layout/root-shell";
import { isSystemSettingsTab, type SystemSettingsTab } from "../components/modals/system-settings-types";

export const Route = createRootRoute({
  validateSearch: (search): { settings?: SystemSettingsTab } => ({
    settings: isSystemSettingsTab(search.settings) ? search.settings : undefined
  }),
  component: RootShell
});
