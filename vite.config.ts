import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";

const apiPort = process.env.PORT ?? "4310";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/client/routes",
      generatedRouteTree: "./src/client/routeTree.gen.ts"
    }),
    tailwindcss(),
    react()
  ],
  build: {
    outDir: "dist/client",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/api": `http://localhost:${apiPort}`
    }
  }
});
