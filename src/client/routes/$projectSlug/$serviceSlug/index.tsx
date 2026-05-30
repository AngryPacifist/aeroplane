import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "../../../pages/service-page";

export const Route = createFileRoute("/$projectSlug/$serviceSlug/")({
  component: ServiceIndexRouteComponent
});

function ServiceIndexRouteComponent() {
  const { projectSlug, serviceSlug } = Route.useParams();
  return <ServicePage projectSlug={projectSlug} serviceSlug={serviceSlug} />;
}
