import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@lab/engine": resolve(__dirname, "../../packages/engine/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["node_modules", "dist", "e2e/**"],
    // The legacy SandboxApp imports ~1000 lines and cytoscape; running
    // every test file in the same worker exceeds the jsdom heap. Use a
    // fresh worker per file so memory resets between files. Vitest 4
    // moved pool-specific options to the top level.
    pool: "forks",
    isolate: true,
  },
});
