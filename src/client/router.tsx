import { RouterProvider, createRouter } from "@tanstack/react-router";
import { indexRoute } from "./routes/index";
import { loginRoute } from "./routes/login";
import { onboardingRoute } from "./routes/onboarding";
import { onboardingSuccessRoute } from "./routes/onboarding-success";
import { projectRoute } from "./routes/project";
import { rootRoute } from "./routes/root";
import { serviceIndexRoute, serviceTabRoute } from "./routes/service";

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, onboardingRoute, onboardingSuccessRoute, projectRoute, serviceIndexRoute, serviceTabRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
