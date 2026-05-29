import { createRoute } from "@tanstack/react-router";
import { OnboardingPage } from "../pages/onboarding-page";
import { rootRoute } from "./root";

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage
});
