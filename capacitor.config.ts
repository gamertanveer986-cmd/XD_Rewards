import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.54c3d7acee4840c694e6f047f5e88bd5',
  appName: 'pay-view-win',
  webDir: 'dist',
  server: {
    url: 'https://54c3d7ac-ee48-40c6-94e6-f047f5e88bd5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-4367114791552152~5768719388',
      // Test devices added at runtime via initializeForTesting flag
    }
  }
};

export default config;
