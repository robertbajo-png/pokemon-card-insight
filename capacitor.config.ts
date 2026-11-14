import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.robertbajo.cardlens",
  appName: "Card Lens",
  webDir: "dist-android",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#101114",
  },
};

export default config;
