import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({ target: "react", quoteStyle: "single" }),
    react(),
    tailwindcss(),
  ],
});
