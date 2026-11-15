import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.robertbajo.cardlens",
  appName: "Card Lens",
  webDir: "dist-android",
  // The bridge can otherwise log complete collection payloads in Debug builds.
  loggingBehavior: "none",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#101114",
  },
};

export default config;
