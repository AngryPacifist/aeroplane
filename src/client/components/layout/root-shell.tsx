import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export function RootShell() {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}
