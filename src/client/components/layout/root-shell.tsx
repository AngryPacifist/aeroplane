import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthGate } from "../auth/auth-gate";
import { GlobalSystemSettings } from "./global-system-settings";

export function RootShell() {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <AuthGate>
        <Outlet />
        <GlobalSystemSettings />
      </AuthGate>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}
