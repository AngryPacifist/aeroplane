import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "../../pages/onboarding-page";

export const Route = createFileRoute("/onboarding/")({
  component: OnboardingPage
});
