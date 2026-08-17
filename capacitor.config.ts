import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.formaly.edu',
  appName: 'Formaly',
  webDir: 'dist',
  server: {
    hostname: 'formaly-gamma.vercel.app',
    androidScheme: 'https'
  }
};

export default config;
