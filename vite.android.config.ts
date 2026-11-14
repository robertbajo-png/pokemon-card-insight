import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// Native uses a separate entry and never reads the web installation's .env files.
export default defineConfig({
  base: "./",
  envDir: path.resolve(__dirname, "config/android"),
  envPrefix: [],
  plugins: [
    react(),
    {
      name: "android-service-boundary",
      generateBundle() {
        for (const id of this.getModuleIds()) {
          const normalized = id.replace(/\\/g, "/");
          if (
            /\/src\/(?:services|contexts|integrations)\//.test(normalized) ||
            normalized.includes("/node_modules/@supabase/")
          ) {
            this.error(
              "Android preview imported a web backend, account or update module.",
            );
          }
        }
      },
    },
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "dist-android",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { input: path.resolve(__dirname, "android.html") },
  },
});
