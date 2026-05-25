import { createRoute, useSearch } from "@tanstack/react-router";
import { isSystemSettingsTab, type SystemSettingsTab } from "../components/modals/system-settings-types";
import { ProjectsPage } from "../pages/projects-page";
import { rootRoute } from "./root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search): { settings?: SystemSettingsTab } => ({
    settings: isSystemSettingsTab(search.settings) ? search.settings : undefined
  }),
  component: IndexRouteComponent
});

function IndexRouteComponent() {
  const search = useSearch({ from: indexRoute.id });
  return <ProjectsPage settingsTab={search.settings} />;
}
