import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./web/src/test/setup.ts"],
    exclude: ["node_modules", "dist", "web/e2e/**"],
  },
});
