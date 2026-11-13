import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const API_TARGET = process.env["VITE_API_URL"] || "http://localhost:8000";

export default defineConfig({
  plugins: [tsConfigPaths(), tanstackStart(), react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
