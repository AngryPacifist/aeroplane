import { createRoute, useParams, useSearch } from "@tanstack/react-router";
import { ProjectPage } from "../pages/project-page";
import { modalTabs, type ModalTab } from "../components/modals/service-modal-types";
import { rootRoute } from "./root";

export const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$projectSlug",
  validateSearch: (search): { service?: string; tab?: ModalTab } => {
    const tab = typeof search.tab === "string" && modalTabs.includes(search.tab as ModalTab) ? (search.tab as ModalTab) : undefined;
    return {
      service: typeof search.service === "string" ? search.service : undefined,
      tab
    };
  },
  component: ProjectRouteComponent
});

function ProjectRouteComponent() {
  const { projectSlug } = useParams({ from: projectRoute.id });
  const search = useSearch({ from: projectRoute.id });
  return <ProjectPage projectSlug={projectSlug} selectedServiceId={search.service} selectedTab={search.tab} />;
}
