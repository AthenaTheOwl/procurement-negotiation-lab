import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom: some engine tests rely on `localStorage` / `sessionStorage`
    // (reportStorage round-trip, chipMap session cache). Pure-node mode
    // would leave both undefined.
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
