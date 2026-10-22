import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: {
    "@": path.resolve(__dirname, "src"),
    "npm:zod@3.25.76": "zod",
    "https://deno.land/std@0.168.0/http/server.ts": path.resolve(__dirname, "tests/stubs/server.ts"),
  } },
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"], restoreMocks: true,
    env: { VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "test-public-key" } },
});
