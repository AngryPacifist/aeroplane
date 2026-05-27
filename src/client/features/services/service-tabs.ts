export type ServiceTab = "overview" | "deployments" | "logs" | "environment" | "domains" | "data" | "sql" | "settings";

export const serviceTabs: ServiceTab[] = ["overview", "deployments", "logs", "environment", "domains", "data", "sql", "settings"];

export type ServiceRouteTab = "overview" | "deployments" | "logs" | "variables" | "domains" | "data" | "console" | "settings";

export const serviceRouteTabs: ServiceRouteTab[] = ["overview", "deployments", "logs", "variables", "domains", "data", "console", "settings"];

export const serviceTabToRouteSegment: Record<ServiceTab, ServiceRouteTab> = {
  overview: "overview",
  deployments: "deployments",
  logs: "logs",
  environment: "variables",
  domains: "domains",
  data: "data",
  sql: "console",
  settings: "settings"
};

export function routeSegmentToServiceTab(segment?: string): ServiceTab {
  if (segment === "variables") return "environment";
  if (segment === "console") return "sql";
  if (segment && serviceTabs.includes(segment as ServiceTab)) return segment as ServiceTab;
  return "overview";
}
