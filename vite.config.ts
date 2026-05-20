import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const apiPort = process.env.PORT ?? "4310";

export default defineConfig({
  plugins: [tailwindcss(), react()],
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
