import { createRoute } from "@tanstack/react-router";
import { LoginPage } from "../pages/login-page";
import { rootRoute } from "./root";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage
});
