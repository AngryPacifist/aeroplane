import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$projectSlug/$serviceSlug")({
  component: ServiceLayoutRouteComponent
});

function ServiceLayoutRouteComponent() {
  return <Outlet />;
}
