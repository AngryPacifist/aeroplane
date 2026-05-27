import { createRoute, useParams } from "@tanstack/react-router";
import { ProjectPage } from "../pages/project-page";
import { rootRoute } from "./root";

export const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$projectSlug",
  component: ProjectRouteComponent
});

function ProjectRouteComponent() {
  const { projectSlug } = useParams({ from: projectRoute.id });
  return <ProjectPage projectSlug={projectSlug} />;
}
