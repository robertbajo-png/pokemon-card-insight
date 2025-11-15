import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.652b4873084a4a6a80af1dd5f9ebe2e0',
  appName: 'Pokemon Card Lens',
  webDir: 'dist',
  server: {
    url: 'https://652b4873-084a-4a6a-80af-1dd5f9ebe2e0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      ios: {
        presentationStyle: 'fullscreen'
      }
    }
  }
};

export default config;
