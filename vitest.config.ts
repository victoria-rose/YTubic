import { defineConfig } from "vitest/config";
import path from "node:path";

// Standalone vitest config (kept separate from vite.config.ts so the heavy
// router/react/tailwind plugins don't run for unit tests). Tests target the
// pure logic modules — parsers, matchers, small utilities — that don't touch
// the Tauri runtime, so a plain node environment is enough.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
