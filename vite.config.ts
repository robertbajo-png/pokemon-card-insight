import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Pokemon Card Lens",
        short_name: "Card Lens",
        description: "Scanna och identifiera Pokemon-kort med AI",
        theme_color: "#FF6B35",
        background_color: "#ffffff",
        display: "standalone",
        start_url:
          process.env.VITE_HOSTING_MODE === "local" ? "/mobile-access" : "/",
        orientation: "portrait",
        icons: [
          {
            src: "/app-icon.jpg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "/app-icon.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Reach the external email gate when renewing mobile access; never
        // answer backend requests with an offline copy of the app shell.
        navigateFallbackDenylist: [
          /^\/backend(?:\/|$)/,
          /^\/mobile-access(?:\/|$)/,
        ],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.pokemontcg\.io\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "pokemon-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
